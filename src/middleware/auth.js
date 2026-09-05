const adminAuth=(req,res,next)=>{
  console.log("admin auth is getting checked");
  const token="xyz";
  const isAdminAuthorizes=token==="xyz";
  if(!isAdminAuthorizes){
       res.status(401).send("unauthorized request") ; 
  }else{
    next();
  }
};
module.exports={adminAuth};