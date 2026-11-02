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

#messageRouter
-GET/user/messages/:userId?page=1&limit=30
-POST/user/messages/:userId {text}
-POST/user/messages/:userId/read
-GET/user/messages - total unread count

#status: ignore,interested, accepted and rejected...