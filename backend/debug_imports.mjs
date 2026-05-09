const path = './routes/';
const files = [
  'authRoute.js','patient.route.js','profile.route.js','dashboard.routes.js','aiRoute.js','twilioVoice.route.js','adminRoute.js','doctorRoute.js','public.routes.js','studentsRoute.js','appointment.route.js','consultationSummary.route.js','userRoute.js'
];

(async ()=>{
  for(const f of files){
    try{
      console.log('importing', f);
      await import(path+f);
      console.log('ok', f);
    }catch(e){
      console.error('ERROR importing', f, e && e.stack || e);
      process.exit(1);
    }
  }
  console.log('all imported OK');
})();
