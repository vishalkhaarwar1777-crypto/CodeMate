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
-POST/request/send/interested/:userId
-POST/request/review/ignored/:userId
-POST/request/reviw/accepted/:requestID
-POST/request/reviw/resjected/:requestID

#userRouter
-GET/user/connections
-GET/user/requests
-GET/user/feed - gets you the profile of ther users on platfoem