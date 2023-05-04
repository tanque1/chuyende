const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");

whiteList = ["https://localhost:3000", "http://localhost:3000"];
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

const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  cors: {
    origin: whiteList,
  },
});

const userConnection = [];

io.on("connection", (socket) => {
  // SocketServer(socket);

  socket.on("userConnect", (user) => {
    const otherUser = userConnection.filter(
      (u) => u.meetingId === user.meetingId
    );
    userConnection.push({
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
    console.log(data);
    socket.to(data.to_connid).emit("SDPProcess", {
      message: data.message,
      from_connid: socket.id,
    });
  });


});

http.listen(5000, () => {
  console.log("Server is running on port", 5000);
});