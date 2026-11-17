import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_RESTAURANTS } from "@/data/restaurants";

interface GooglePlace {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const restaurant = SAMPLE_RESTAURANTS.find((item) => item.slug === slug);

  if (!restaurant) {
    return NextResponse.json({ error: "Unknown restaurant." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Places API key is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery: `${restaurant.name}, ${restaurant.address}`,
        languageCode: "en",
        maxResultCount: 5,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Google Places rating request failed:", response.status);
      return NextResponse.json(
        { error: "Google ratings are temporarily unavailable." },
        { status: 502 }
      );
    }

    const result = (await response.json()) as { places?: GooglePlace[] };
    const expectedName = normalize(restaurant.name);
    const place = result.places?.find((candidate) => {
      const name = candidate.displayName?.text;
      const address = candidate.formattedAddress;
      return (
        typeof name === "string" &&
        typeof address === "string" &&
        normalize(name).includes(expectedName) &&
        address.toLowerCase().includes("bhopal")
      );
    });

    if (typeof place?.rating !== "number") {
      return NextResponse.json(
        { error: "A matching Google rating was not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      rating: place.rating,
      reviewCount: place.userRatingCount ?? 0,
    });
  } catch (error) {
    console.error("Google Places rating lookup failed:", error);
    return NextResponse.json(
      { error: "Google ratings are temporarily unavailable." },
      { status: 502 }
    );
  }
}
