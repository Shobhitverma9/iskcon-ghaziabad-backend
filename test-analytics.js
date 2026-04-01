require('dotenv').config(); 
const mongoose = require('mongoose'); 

mongoose.connect(process.env.MONGODB_URI).then(() => { 
  mongoose.connection.db.collection('donations').aggregate([
    { $match: { status: 'completed' } }, 
    { $group: { _id: { $toLower: '$donorEmail' }, email: { $first: '$donorEmail' } } }, 
    { $lookup: { from: 'users', localField: 'email', foreignField: 'email', as: 'user' } }, 
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, 
    { $lookup: { 
        from: 'subscriptions', 
        let: { userId: '$user._id' }, 
        pipeline: [ 
          { $match: { 
              $expr: { 
                $and: [ 
                  { $eq: ['$userId', { $toString: '$$userId' }] }, 
                  { $eq: ['$status', 'active'] } 
                ] 
              } 
            } 
          } 
        ], 
        as: 'activeSubscriptions' 
      } 
    }, 
    { $addFields: { activeSubscriptionCount: { $size: '$activeSubscriptions' } } }, 
    { $project: { user: 0, activeSubscriptions: 0 } }, 
    { $sort: { activeSubscriptionCount: -1 } }, 
    { $limit: 3 } 
  ]).toArray().then(res => { 
    console.log(JSON.stringify(res, null, 2)); 
    process.exit(0); 
  }); 
});
