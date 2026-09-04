const express = require("express");

const app = express();

app.get("/user", (req, res) => {
  res.send({
    FirstName: "vishal",
    LastName: "kharwar"
  });
});
app.get("/user/:id",(req,res) => {
    res.send(req.params);
});
app.get("/user",(req,res)=>{
  console.log(req.query);
  res.send(req.query);
});

app.use("/test", (req, res) => {
  res.send("Helloooo");
});

app.listen(3000, () => {
  console.log("server is successfully listening on port 3000");
});