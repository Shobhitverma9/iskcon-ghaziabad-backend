require('dotenv').config(); 
const mongoose = require('mongoose'); 

mongoose.connect(process.env.MONGODB_URI).then(() => { 
  mongoose.connection.db.collection('users').findOne({_id: new mongoose.Types.ObjectId('69bc22b60e46aee17b067a68')}).then(res => { 
    console.log(JSON.stringify(res, null, 2)); 
    process.exit(0); 
  }); 
});
