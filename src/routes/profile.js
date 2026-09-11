const express=require("express");
const profileRouter=express.Router();
const { userAuth } = require("../middleware/auth");
const{validateEditprofileData}=require("../utils/validation");



profileRouter.get("/profile/view",userAuth,async(req,res)=>{
 try{ 
  const user=req.user;
  res.send(user);
  }catch(err){
    res.status(400).send("ERROR:"+err.message);
  }
});

profileRouter.patch("/profile/edit", userAuth, async(req,res)=>{
        try{
          if(!validateEditprofileData){
            throw new Error("Invalid edit request!!")
          }
          const loggedInUser=rew.user;
          Object.keys(req.body).forEach((key)=>(loggedInUser[key]=req.body[key]));

          await loggedInUser.save();
          res.send("profile logged successfully..")
        }
          catch(err){
            res.status(400).send("ERROR :" + err.message)
          }
});
module.exports = profileRouter;