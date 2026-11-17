import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.GOOGLE_PLACES_API_KEY;
});

test("returns a Google rating only for a matching restaurant in Bhopal", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "unit-test-key";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestInit = init;
    return new Response(
      JSON.stringify({
        places: [
          {
            displayName: { text: "Sai Baba Dhaba and Family Restaurant" },
            formattedAddress: "Bhanpur, Bhopal, Madhya Pradesh",
            rating: 4.7,
            userRatingCount: 123,
          },
        ],
      }),
      { status: 200 }
    );
  };

  const response = await GET(
    new NextRequest("http://localhost/api/google-places/rating?slug=veg")
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { rating: 4.7, reviewCount: 123 });
  assert.equal(
    new Headers(requestInit?.headers).get("X-Goog-Api-Key"),
    "unit-test-key"
  );
  assert.equal(
    new Headers(requestInit?.headers).get("X-Goog-FieldMask"),
    "places.displayName,places.formattedAddress,places.rating,places.userRatingCount"
  );
});

test("does not use a similarly named but different Google result", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "unit-test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        places: [
          {
            displayName: { text: "Another Dhaba" },
            formattedAddress: "Bhopal, Madhya Pradesh",
            rating: 4.9,
            userRatingCount: 50,
          },
        ],
      }),
      { status: 200 }
    );

  const response = await GET(
    new NextRequest("http://localhost/api/google-places/rating?slug=veg")
  );

  assert.equal(response.status, 404);
});

test("reports a missing Google Places API key", async () => {
  delete process.env.GOOGLE_PLACES_API_KEY;

  const response = await GET(
    new NextRequest("http://localhost/api/google-places/rating?slug=veg")
  );

  assert.equal(response.status, 503);
});
