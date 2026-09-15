const mongoose=require("mongoose");

const connectionRequestSchema=new mongoose.Schema({
  fromUserId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"user",
    required:true,
  },
  toUserId:{
    type:mongoose.Schema.Types.ObjectId,
    required:true,
  },
  status:{
    type:String,
    required:true,
    enum:{
      values:["ignored","interested","accepted","rejected"],
      message:`{VALUE} is incorrect status type`,
    }
  }
},
{
   timestamps:true,
});
// user try to send request to your self
connectionRequestSchema.pre("save", function () {
  if (this.fromUserId.equals(this.toUserId)) {
    throw new Error("Cannot send connection request to yourself");
  }
});

const ConnectionRequestModel= mongoose.model("ConnectionRequest",connectionRequestSchema);

module.exports=ConnectionRequestModel;