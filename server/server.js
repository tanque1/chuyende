const express = require("express");
const path = require("path");
const app = express();
const fs = require("fs");
const fileUpload = require("express-fileupload");
const cors = require("cors");
let userConnections = [];
let listMeetings = [];
whiteList = [
  "https://localhost:3000",
  "http://localhost:3000",
  "https://192.168.1.24:3000",
  "https://116.109.252.13:3000",
];
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
app.use(express.static("public"));
app.use(fileUpload());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  cors: {
    origin: whiteList,
  },
});

app.use("/create-meeting", (req, res) => {
  const { meetId, owner, sub } = req.body;
  if (!meetId || !owner || !sub) return res.json({ status: false });
  listMeetings.push({
    meetId: meetId,
    owner: [owner],
    users: [
      {
        sub: sub,
        audio: true,
        video: true,
        shareFile: true,
        chat: true,
      },
    ],
  });
  return res.json({ status: true });
});

app.post("/get-info-meeting", (req, res) => {
  const { meetId, sub } = req.body;

  const checkMeeting = listMeetings.find((l) => l.meetId === +meetId);
  console.log(checkMeeting);
  if (!checkMeeting) {
    return res.json({ message: "Mã phòng không hợp lệ", status: 0 });
  }
  const userInMeet = checkMeeting.users.find((u) => u?.sub === sub);
  if (!userInMeet) {
    return res.json({ message: "Người dùng chưa tham gia phòng", status: 1 });
  }
  return res.json({
    user: userInMeet,
    status: true,
    owner: checkMeeting.owner?.includes(sub),
  });
});

app.get("/download/:meetingId/:fileName", (req, res) => {
  const { meetingId, fileName } = req.params;
  return res.download(`./public/attachment/${meetingId}/${fileName}`);
  //  return res.attachment(
  //   path.join(
  //     __dirname,
  //     "public/attachment/3744/Pizza_Gap_Doi_Nhan_Phu_Hai_San_Xot_Pesto_400x275.jpg"
  //   )
});

app.post("/attach-file", (req, res) => {
  const data = req.body;
  const file = req.files["zipFile"];
  const dir = "public/attachment/" + data.meetingId + "/";
  if (!fs.existsSync(dir)) {
    fs.mkdir(path.join(__dirname, dir), { recursive: true }, (err) => {
      if (err) {
        return console.error(err);
      }
      console.log("Directory created successfully!");
    });
  }
  file.mv(
    path.join(
      __dirname,
      "public/attachment/" +
        data.meetingId +
        "/" +
        Buffer.from(file.name, "latin1").toString("utf8")
    ),
    (error) => {
      if (error) {
        console.log("Loi up file", error);
      } else {
        console.log("up file thanh cong");
      }
    }
  );
  res.json({ message: true });
});

io.on("connection", (socket) => {
  // SocketServer(socket);

  socket.on("userConnect", (user) => {
    const otherUser = userConnections.filter(
      (u) => u.meetingId === user.meetingId
    );
    userConnections.push({
      ...user,
      connectionId: socket.id,
      userId: user.name,
      meetingId: user.meetingId,
    });
    otherUser.forEach((v) => {
      socket.to(v.connectionId).emit("informOtherAboutMe", {
        ...user,
        otherUserId: user.name,
        connId: socket.id,
      });
    });

    socket.emit("informMeAboutOtherUser", otherUser);
  });

  socket.on("SPDProcess", (data) => {
    socket.to(data.to_connid).emit("SDPProcess", {
      message: data.message,
      from_connid: socket.id,
    });
  });

  socket.on("fileTransferToOther", (data) => {
    const mUser = userConnections.find((p) => p.connectionId === socket.id);
    if (mUser) {
      const meetingId = mUser.meetingId;
      const from = mUser.userId;
      const list = userConnections.filter((p) => p.meetingId === meetingId);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("showShareFile", {
          userName: data.userName,
          fileName: data.fileName,
          filePath: data.filePath,
        });
      });
    }
  });

  socket.on("changeUserVideoPermissions", (data) => {
    userConnections = userConnections.map((u) => {
      if (u.connectionId === data.connId && data.meetingId === u.meetingId) {
        return {
          ...u,
          video: data.stateVideo,
        };
      } else {
        return u;
      }
    });
    const list = userConnections.filter((p) => p.meetingId === data.meetingId);
    list.forEach((v) =>
      socket.to(v.connectionId).emit("informUserVideoPermissions", data)
    );
  });

  socket.on("changeUserAudioPermissions", (data) => {
    userConnections = userConnections.map((u) => {
      if (u.connectionId === data.connId && data.meetingId === u.meetingId) {
        return {
          ...u,
          audio: data.stateAudio,
        };
      } else {
        return u;
      }
    });
    const list = userConnections.filter((p) => p.meetingId === data.meetingId);
    list.forEach((v) =>
      socket.to(v.connectionId).emit("informUserAudioPermissions", data)
    );
  });

  socket.on("changeUserChatPermissions", (data) => {
    userConnections = userConnections.map((u) => {
      if (u.connectionId === data.connId && data.meetingId === u.meetingId) {
        return {
          ...u,
          chat: data.stateChat,
        };
      } else {
        return u;
      }
    });
    const list = userConnections.filter((p) => p.meetingId === data.meetingId);
    list.forEach((v) =>
      socket.to(v.connectionId).emit("informUserChatPermissions", data)
    );
  });

  socket.on("changeUserShareFilePermissions", (data) => {
    userConnections = userConnections.map((u) => {
      if (u.connectionId === data.connId && data.meetingId === u.meetingId) {
        return {
          ...u,
          shareFile: data.stateShareFile,
        };
      } else {
        return u;
      }
    });
    const list = userConnections.filter((p) => p.meetingId === data.meetingId);
    list.forEach((v) =>
      socket.to(v.connectionId).emit("informUserShareFilePermissions", data)
    );
  });

  socket.on("userPermissionToEnterMeeting", (data) => {
    const admin = userConnections.filter(
      (p) => data.meetingId === p.meetingId && p.owner === true
    );
    admin.forEach((u) =>
      socket
        .to(u.connectionId)
        .emit("informUserRequestJoinMeeting", { ...data, connId: socket.id })
    );
  });

  socket.on("acceptUserJoinMeeting", (data) => {
    listMeetings = listMeetings.map((l) => {
      if (+l.meetId === +data.meetingId) {
        return {
          ...l,
          users: [
            ...l.users,
            {
              sub: data.sub,
              audio: true,
              video: true,
              shareFile: true,
              chat: true,
            },
          ],
        };
      } else {
        return l;
      }
    });
    socket.to(data.connId).emit("responseRequestJoinMeeting", data);
  });

  socket.on("changeUserPerToAdmin", (data) => {
    listMeetings = listMeetings.map((l) => {
      if (+l.meetId === +data.meetingId) {
        return {
          ...l,
          owner: [...l.owner, data.sub],
          users: l.users.map((u) => {
            if (u.sub === data.sub) {
              return {
                ...u,
                audio: true,
                video: true,
                shareFile: true,
                chat: true,
              };
            }
            return u;
          }),
        };
      }
      return l;
    });
     userConnections = userConnections.map((user) => {
      if( +data.meetingId === +user.meetingId){
        return {
          ...user,
          audio: true,
          video: true,
          shareFile: true,
          chat: true,
          owner: true
        }
      }else {
        return user;
      }
     })
    const otherUser = userConnections.filter(
      (u) => +u.meetingId === +data.meetingId
    );
    otherUser.forEach(o =>{
      socket.to(o.connectionId).emit("informUpdatePermissionsUser",data)
    })
  });

  socket.on("addRoom",(data) =>{
    console.log(data);
    listMeetings.push({
      meetId: data.meetId,
      owner: [data.owner],
      users: [
        {
          sub: data.owner,
          audio: true,
          video: true,
          shareFile: true,
          chat: true,
        },
        ...data.users?.map(u => {
          return {
            sub: u.sub,
            audio: true,
            video: true,
            shareFile: true,
            chat: true,
          }
        })
      ],
    });
    data.users?.forEach(u =>{
      socket.to(u.connId).emit("informUsersAddedToTheRoom",data.meetId)
    })
  })

  socket.on("disconnect", () => {
    const disUser = userConnections.find((p) => p.connectionId === socket.id);
    if (disUser) {
      const meetingId = disUser.meetingId;
      userConnections = userConnections.filter(
        (p) => p.connectionId !== socket.id
      );
      const list = userConnections.filter((p) => p.meetingId === meetingId);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("inFormAboutDisconnectedUser", {
          connId: socket.id,
        });
      });
    }
  });

  socket.on("sendMessage", (msg) => {
    const mUser = userConnections.find((p) => p.connectionId === socket.id);
    if (mUser) {
      const meetingId = mUser.meetingId;
      const from = mUser.userId;
      const list = userConnections.filter((p) => p.meetingId === meetingId);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("showChatMessage", {
          id: socket.id,
          message: msg,
          from,
        });
      });
    }
  });
});

http.listen(5000, () => {
  console.log("Server is running on port", 5000);
});
