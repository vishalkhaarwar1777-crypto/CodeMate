#DevTinder APIs
#authRouter
-POST/signup
-POST/login
-POST/logout

#profileRouter
-GET/profile/view
-PATCH/profile/edit
-PATCH/profile/password // forgot password api

#connectionRequestRouter
-POST/request/send/status/:userId
-POST/request/reviw/accepted/:requestID
-POST/request/reviw/resjected/:requestID

#userRouter
-GET/user/requests/received
-GET/user/connections
-GET/user/feed - gets you the profile of ther users on platfoem

#status: ignore,interested, accepted and rejected...