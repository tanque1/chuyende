const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");

whiteList = ["https://localhost:3000", "http://localhost:3000","https://192.168.1.13:3000","https://27.75.17.119:3000"];
const corsOptions = {
  credentials: true,
  methods: ["POST", "GET", "PUT", "DELETE"],
  origin: (origin, callback) => {
    if (whiteList.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/",(req,res) => {
  return res.json({"message":"Test"})
})

const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  cors: {
    origin: whiteList,
  },
});

let userConnections = [];

io.on("connection", (socket) => {
  // SocketServer(socket);

  socket.on("userConnect", (user) => {
    console.log(user);
    const otherUser = userConnections.filter(
      (u) => u.meetingId === user.meetingId
    );
    userConnections.push({
      connectionId: socket.id,
      userId: user.displayName,
      meetingId: user.meetingId,
    });
    otherUser.forEach((v) => {
      socket.to(v.connectionId).emit("informOtherAboutMe", {
        otherUserId: user.displayName,
        connId: socket.id,
      });
    });

    socket.emit("informMeAboutOtherUser", otherUser)

  });

  socket.on("SPDProcess", (data) => {
    socket.to(data.to_connid).emit("SDPProcess", {
      message: data.message,
      from_connid: socket.id,
    });
  });

  socket.on("disconnect", () => {
   const disUser =  userConnections.find(p => p.connectionId === socket.id)
    if(disUser) {
      const meetingId = disUser.meetingId;
      userConnections = userConnections.filter((p) => p.connectionId !== socket.id)
      const list = userConnections.filter(p => p.meetingId === meetingId);
      list.forEach(v => {
        socket.to(v.connectionId).emit("inFormAboutDisconnectedUser",{
          connId: socket.id,

        })
      })
    }
  })

  socket.on("sendMessage", (msg) => {
    const mUser = userConnections.find(p => p.connectionId === socket.id)
    if(mUser){
      const meetingId = mUser.meetingId
      const from = mUser.userId;
      const list = userConnections.filter(p => p.meetingId === meetingId);
      console.log(list);
      list.forEach((v) => {
        console.log(msg);
        socket.to(v.connectionId).emit("showChatMessage",{
          id: socket.id,
          message: msg,
          from
        });
      })

    }
  })

});

http.listen(5000 ,() => {
  console.log("Server is running on port", 5000);
});
