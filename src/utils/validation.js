const validator= require("validator");

const validateSignupData=(req)=>{
   const{firstName,lastName,emailId,password}=req.body;
   if(!firstName || !lastName){
    throw new Error("Name is not valid")
   }else if(!validator.isEmail(emailId)){
     throw new Error("Invalid emailId");
   }else if(!validator.isStrongPassword(password)){
      throw new Error("Enter valid password")
   }
};

const validateEditprofileData=(req)=>{
   const allowedEditField=["firstName","lastName","age","about","profilePhoto","skill"];

const isEditAllowed=Object.keys(req.body).every((field)=>{
   allowedEditField.includes(field);
});
     return isEditAllowed;
};


module.exports={validateSignupData,validateEditprofileData};
