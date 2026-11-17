require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI missing'); process.exit(1); }

function hashPassword(pw){
  const salt = crypto.randomBytes(32).toString('hex');
  const N=16384,r=8,p=1,keylen=64;
  return new Promise((res,rej)=>{
    crypto.scrypt(pw,salt,keylen,{N,r,p},(err,dk)=>{ if(err) rej(err); else res(`scrypt$${N}$${r}$${p}$${salt}$${dk.toString('hex')}`); });
  });
}

(async()=>{
  try{
    await mongoose.connect(MONGODB_URI);
    const adminSchema = new mongoose.Schema({email:String,passwordHash:String,phone:String,name:String,role:String,isActive:Boolean,totpEnabled:Boolean,failedLoginAttempts:Number});
    const Admin = mongoose.models.AdminUser || mongoose.model('AdminUser', adminSchema);
    const email='admin@gmail.com';
    const hash=await hashPassword('Admin@12');
    const doc = await Admin.findOneAndUpdate(
      {email:email.toLowerCase()},
      {$set:{passwordHash:hash, isActive:true, name:'Admin', phone:'8899140083', role:'super_admin', totpEnabled:false, failedLoginAttempts:0}},
      {upsert:true, new:true, setDefaultsOnInsert:true}
    );
    console.log('Set admin:',doc.email);
  }catch(e){console.error(e);}
  finally{await mongoose.disconnect(); process.exit(0);} 
})();
