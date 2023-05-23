import React, { useEffect, useRef, useState } from "react";
import { BsFillPeopleFill } from "react-icons/bs";
import { FiMoreVertical } from "react-icons/fi";
import { IoIosCall } from "react-icons/io";
import { MdMessage } from "react-icons/md";
import { SlArrowDown } from "react-icons/sl";
import { useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { BASE_URI, BASE_URI_CLIENT } from "../../utils/constant";
import ModalConfirm from "../../components/ModalConfirm";
import UserMenu from "../../components/UserMenu";
import { RiVideoAddFill } from "react-icons/ri";
import ModalAddRoom from "../../components/ModalAddRoom";
const AppProcess = (() => {
  let serverProcess;
  let peers_connection_ids = [];
  let peers_connection = [];
  let remote_vid_stream = [];
  let remote_aud_stream = [];
  let local_div;
  // eslint-disable-next-line no-unused-vars
  let my_connection_id;
  let audio;
  let isAudioMute = true;
  const rtpAudSenders = [];
  const videoStates = {
    None: 0,
    Camera: 1,
    ScreenShare: 2,
  };

  let videoSt = videoStates.None;

  let videoCamTrack;

  let rtpVidSenders = [];

  const _init = async (SDP_func, my_connid) => {
    my_connection_id = my_connid;
    serverProcess = SDP_func;
    eventProcess();
    local_div = document.getElementById("localVideoPlayer");
  };

  var eventProcess = () => {
    const mic = document.getElementById("miceMuteUnmute");
    mic.addEventListener("click", async function () {
      if (!audio) {
        await loadAudio();
      }
      if (!audio) {
        alert("Audio permission has not granted");
        return;
      }
      if (isAudioMute) {
        audio.enabled = true;
        document.getElementById(
          "miceMuteUnmute"
        ).innerHTML = `<span class="material-icons">mic</span>`;
        isAudioMute = false;
        updateMediaSenders(audio, rtpAudSenders);
      } else {
        audio.enabled = false;

        document.getElementById(
          "miceMuteUnmute"
        ).innerHTML = `<span class="material-icons">mic_off</span>`;

        removeMediaSenders(rtpAudSenders);
        isAudioMute = !isAudioMute;
      }
    });

    const vid = document.getElementById("videoCamOff");
    vid.addEventListener("click", async function () {
      if (videoSt === videoStates.Camera) {
        await videoProcess(videoStates.None);
      } else {
        await videoProcess(videoStates.Camera);
      }
    });

    const screenShare = document.getElementById("btnScreenShare");
    screenShare.addEventListener("click", async function () {
      if (videoSt === videoStates.ScreenShare) {
        await videoProcess(videoStates.None);
      } else {
        await videoProcess(videoStates.ScreenShare);
      }
    });
  };

  const muteAudio = () => {
    if (audio) {
      audio.enabled = false;
    }

    document.getElementById(
      "miceMuteUnmute"
    ).innerHTML = `<span class="material-icons">mic_off</span>`;

    removeMediaSenders(rtpAudSenders);
    isAudioMute = !isAudioMute;
  };

  async function loadAudio() {
    try {
      let astream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });

      audio = astream.getAudioTracks()[0];
      audio.enabled = false;
    } catch (error) {
      console.log(error);
    }
  }

  function connectionStatus(connection) {
    if (
      connection &&
      (connection.connectionState === "new" ||
        connection.connectionState === "connecting" ||
        connection.connectionState === "connected")
    ) {
      return true;
    } else {
      return false;
    }
  }
  async function updateMediaSenders(track, rtpSenders) {
    for (var conID in peers_connection_ids) {
      if (connectionStatus(peers_connection[conID])) {
        if (rtpSenders[conID] && rtpSenders[conID].track) {
          rtpSenders[conID].replaceTrack(track);
        } else {
          rtpSenders[conID] = peers_connection[conID].addTrack(track);
        }
      }
    }
  }

  function removeMediaSenders(rtpSenders) {
    for (let conId in peers_connection_ids) {
      if (rtpSenders[conId] && connectionStatus(peers_connection[conId])) {
        peers_connection[conId].removeTrack(rtpSenders[conId]);
        rtpSenders[conId] = null;
      }
    }
  }

  function removeVideoStream(rtpVidSenders) {
    if (videoCamTrack) {
      videoCamTrack.stop();
      videoCamTrack = null;
      local_div.srcObject = null;
      removeMediaSenders(rtpVidSenders);
    }
  }

  async function videoProcess(newVideoState) {
    if (newVideoState === videoStates.None) {
      document.getElementById("videoCamOff").innerHTML = `
      <span class="material-icons">videocam_off</span>`;

      document.getElementById("btnScreenShare").innerHTML = `
      <span class="material-icons">present_to_all</span>
            <div>Hiện tại</div>
      `;

      videoSt = newVideoState;
      removeVideoStream(rtpVidSenders);
      return;
    }

    // if (newVideoState === videoStates.Camera) {
    //   document.getElementById("videoCamOff").innerHTML = `
    //   <span class="material-icons">videocam</span>`;
    // }
    try {
      let vstream = null;
      if (newVideoState === videoStates.Camera) {
        vstream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
      } else if (newVideoState === videoStates.ScreenShare) {
        vstream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
        vstream.oninactive = () => {
          removeVideoStream(rtpVidSenders);
          document.getElementById("btnScreenShare").innerHTML = `
          <span class="material-icons">present_to_all</span>
        <div >Chia sẽ</div>
          `;
        };
      }

      if (vstream && vstream.getVideoTracks().length > 0) {
        videoCamTrack = vstream.getVideoTracks()[0];
        if (videoCamTrack) {
          local_div.srcObject = new MediaStream([videoCamTrack]);
          updateMediaSenders(videoCamTrack, rtpVidSenders);
        }
      }
    } catch (error) {
      console.log(error);
      return;
    }
    videoSt = newVideoState;

    if (newVideoState === videoStates.Camera) {
      document.getElementById("videoCamOff").innerHTML = `
      <span class="material-icons">videocam</span>`;

      document.getElementById("btnScreenShare").innerHTML = `
        <span class="material-icons">present_to_all</span>
      <div >Chia sẽ</div>
        `;
    } else if (newVideoState === videoStates.ScreenShare) {
      document.getElementById("videoCamOff").innerHTML = `
      <span class="material-icons">videocam_off</span>`;

      document.getElementById("btnScreenShare").innerHTML = `
      <span class="material-icons text-green-500">present_to_all</span>
      <div class="text-green-500">Dừng chia sẽ</div>`;
    }
  }

  const iceConfiguration = {
    // iceServers: [
    //   {
    //     urls: "stun:stun.l.google.com:19302",
    //   },
    //   {
    //     urls: "stun:stun1.l.google.com:19302",
    //   },
    // ],
    iceServers: [
      {
        urls: ["stun:hk-turn1.xirsys.com"],
      },
      {
        username:
          "V-7-Nf61cy6nO0kyk2EHrWSO971Q08zr_mns71GwklONo9x8ZLde9P4m2w-f54rUAAAAAGRV3550YW5xdWUxNTAx",
        credential: "55a7168c-ebcb-11ed-843c-0242ac120004",
        urls: [
          "turn:hk-turn1.xirsys.com:80?transport=udp",
          "turn:hk-turn1.xirsys.com:3478?transport=udp",
          "turn:hk-turn1.xirsys.com:80?transport=tcp",
          "turn:hk-turn1.xirsys.com:3478?transport=tcp",
          "turns:hk-turn1.xirsys.com:443?transport=tcp",
          "turns:hk-turn1.xirsys.com:5349?transport=tcp",
        ],
      },
    ],
  };

  const setOffer = async (connId) => {
    const connection = peers_connection[connId];
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    serverProcess(
      JSON.stringify({
        offer: connection.localDescription,
      }),
      connId
    );
  };

  const setConnection = async (connId) => {
    const connection = new RTCPeerConnection(iceConfiguration);

    connection.onnegotiationneeded = async (e) => {
      await setOffer(connId);
    };
    connection.onicecandidate = (e) => {
      if (e.candidate) {
        serverProcess(JSON.stringify({ icecandidate: e.candidate }), connId);
      }
    };
    connection.ontrack = (e) => {
      console.log(e);
      if (!remote_vid_stream[connId]) {
        remote_vid_stream[connId] = new MediaStream();
      }
      if (!remote_aud_stream[connId]) {
        remote_aud_stream[connId] = new MediaStream();
      }
      if (e.track.kind === "video") {
        remote_vid_stream[connId]
          .getVideoTracks()
          .forEach((t) => remote_vid_stream[connId].removeTrack(t));

        remote_vid_stream[connId].addTrack(e.track);

        const remoteVideoPlayer = document.getElementById("v_" + connId);

        remoteVideoPlayer.srcObject = null;
        remoteVideoPlayer.srcObject = remote_vid_stream[connId];
        remoteVideoPlayer.load();
      } else if (e.track.kind === "audio") {
        remote_aud_stream[connId]
          .getAudioTracks()
          .forEach((t) => remote_aud_stream[connId].removeTrack(t));

        remote_aud_stream[connId].addTrack(e.track);

        const remoteAudioPlayer = document.getElementById("a_" + connId);
        remoteAudioPlayer.srcObject = null;
        remoteAudioPlayer.srcObject = remote_aud_stream[connId];
        remoteAudioPlayer.load();
      }
    };
    peers_connection_ids[connId] = connId;
    peers_connection[connId] = connection;
    if (videoSt === videoStates.Camera || videoSt === videoStates.ScreenShare) {
      if (videoCamTrack) {
        updateMediaSenders(videoCamTrack, rtpVidSenders);
      }
    }
    return connection;
  };

  const SDPProcess = async (message, from_connid) => {
    message = JSON.parse(message);
    for (const s of peers_connection[from_connid].getSenders()) {
      if (s.track == null) {
        const remoteVideoPlayer = document.getElementById("v_" + from_connid);
        remoteVideoPlayer.srcObject = null;
        remoteVideoPlayer.load();
      }
    }

    if (message.answer) {
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
    } else if (message.offer) {
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      const answer = await peers_connection[from_connid].createAnswer();
      await peers_connection[from_connid].setLocalDescription(answer);
      serverProcess(JSON.stringify({ answer: answer }), from_connid);
    } else if (message.icecandidate) {
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }
      try {
        await peers_connection[from_connid].addIceCandidate(
          message.icecandidate
        );
      } catch (error) {
        console.log(error);
      }
    }
  };

  const closeConnection = async (connId) => {
    peers_connection_ids[connId] = null;
    if (peers_connection[connId]) {
      peers_connection[connId].close();
      peers_connection[connId] = null;
    }
    if (remote_aud_stream[connId]) {
      remote_aud_stream[connId].getTracks().forEach((t) => {
        if (t.stop) t.stop();
      });
      remote_aud_stream[connId] = null;
    }

    if (remote_vid_stream[connId]) {
      remote_vid_stream[connId].getTracks().forEach((t) => {
        if (t.stop) t.stop();
      });
      remote_vid_stream[connId] = null;
    }
  };

  return {
    setNewConnection: async (connId) => {
      await setConnection(connId);
    },
    init: async (SDP_func, my_connid) => {
      await _init(SDP_func, my_connid);
    },
    processClientFunc: async (data, from_connid) => {
      await SDPProcess(data, from_connid);
    },
    closeConnectionCall: async (connId) => {
      await closeConnection(connId);
    },
    videoProcess,
    muteAudio,
  };
})();

export default function Meeting() {
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [firstLoad, setFirstLoad] = useState(false);
  const [messages, setMessages] = useState([]);
  const inputRef = useRef();
  const fileRef = useRef();
  const { socket } = useSelector((state) => state.connection);
  const [isShowChat, setIsShowChat] = useState(false);
  const [isShowDetail, setIsShowDetail] = useState(false);
  const [isShowStatusCopy, setIsShowStatusCopy] = useState(false);
  const [isShowDialog, setIsShowDialog] = useState(false);
  const [listShareFile, setListShareFile] = useState([]);
  const [isShowShareForm, setIsShowShareForm] = useState(false);
  const [userJoinMeet, setUserJoinMeet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isShowModalAddRoom, setIsShowModalAddRoom] = useState(false);
  const [listRoom, setListRoom] = useState([]);
  const { info } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const handleLeaveMeeting = () => {
    navigate("/", { replace: true });
    socket && socket.close();
  };
  const handleSendMessage = () => {
    if (!inputRef.current.value) return;
    const time = new Date();
    const lTime = time.toLocaleString("vi-VN");
    const data = {
      time: lTime,
      message: inputRef.current.value,
      from: "Tôi",
    };
    setMessages((pre) => [...pre, { ...data, time: lTime }]);

    socket.emit("sendMessage", inputRef.current.value);
    inputRef.current.value = "";
  };

  const handleShowDetailsParticipant = () => {
    setIsShowDetail(true);
    setIsShowChat(true);
  };

  const handleCloseModalConfirm = () => {
    setUserJoinMeet(false);
  };

  const handleAcceptModalConfirm = () => {
    socket && socket.emit("acceptUserJoinMeeting", userJoinMeet);
    setUserJoinMeet(false);
  };

  const handleCopyClipBoard = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsShowStatusCopy(true);
    setTimeout(() => {
      setIsShowStatusCopy(false);
    }, 3000);
  };

  const handleShowDetailsChat = () => {
    setIsShowDetail(true);
    setIsShowChat(false);
  };

  function openFullscreen(elem) {
    if (!document.fullscreenElement) {
      elem.target.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
  }

  const handleShareFile = async () => {
    try {
      const file = fileRef.current.files[0];
      console.log(file);
      const formData = new FormData();
      formData.append("zipFile", file);
      formData.append("meetingId", id);
      formData.append("userName", currentUser.name);

      const res = axios.post(BASE_URI + "attach-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const attachFileName = file.name;
      const attachPath = BASE_URI + "attachment/" + id + "/" + attachFileName;
      setListShareFile((pre) => {
        return [
          ...pre,
          {
            userName: "Tôi",
            fileName: attachFileName,
            filePath: attachPath,
          },
        ];
      });
      fileRef.current.value = "";
      socket &&
        socket.emit("fileTransferToOther", {
          userName: currentUser.name,
          fileName: attachFileName,
          filePath: attachPath,
          meetingId: id,
        });
    } catch (error) {}
  };

  const handleChangeUserVideoPer = (connId, meetingId, stateVideo) => {
    socket &&
      socket.emit("changeUserVideoPermissions", {
        connId,
        meetingId,
        stateVideo: !stateVideo,
      });
    setUsers((pre) => {
      return pre.map((u) => {
        if (connId === u.connId) {
          return {
            ...u,
            video: !stateVideo,
          };
        } else {
          return u;
        }
      });
    });
  };

  const handleChangeUserAudioPer = (connId, meetingId, stateAudio) => {
    socket &&
      socket.emit("changeUserAudioPermissions", {
        connId,
        meetingId,
        stateAudio: !stateAudio,
      });
    setUsers((pre) => {
      return pre.map((u) => {
        if (connId === u.connId) {
          return {
            ...u,
            audio: !stateAudio,
          };
        } else {
          return u;
        }
      });
    });
  };

  const handleChangeUserChatPer = (connId, meetingId, stateChat) => {
    socket &&
      socket.emit("changeUserChatPermissions", {
        connId,
        meetingId,
        stateChat: !stateChat,
      });
    setUsers((pre) => {
      return pre.map((u) => {
        if (connId === u.connId) {
          return {
            ...u,
            chat: !stateChat,
          };
        } else {
          return u;
        }
      });
    });
  };

  const handleChangeUserShareFilePer = (connId, meetingId, stateShareFile) => {
    socket &&
      socket.emit("changeUserShareFilePermissions", {
        connId,
        meetingId,
        stateShareFile: !stateShareFile,
      });
    setUsers((pre) => {
      return pre.map((u) => {
        if (connId === u.connId) {
          return {
            ...u,
            shareFile: !stateShareFile,
          };
        } else {
          return u;
        }
      });
    });
  };

  const handleChangeUserPerToAdmin = (connId, meetingId, sub) => {
    setUsers((pre) => {
      return pre.map((u) => {
        if (u.connId === connId) {
          return {
            ...u,
            owner: true,
          };
        } else {
          return u;
        }
      });
    });
    socket &&
      socket.emit("changeUserPerToAdmin", {
        connId,
        meetingId,
        sub,
      });
  };

  const handleAddRoom = (list) => {
    const meetingID = Math.floor(Math.random() * 100000);

    socket &&
      socket.emit("addRoom", {
        owner: currentUser.sub,
        users: list,
        meetId: meetingID,
      });
    setListRoom((pre) => [meetingID, ...pre]);
  };

  const handleInvitingUserOutRoom = (connId, meetingId, sub) => {
    socket &&
      socket.emit("InvitingUserOutRoom", {
        connId,
        meetingId,
        sub,
      });
    setUsers((pre) => {
      return pre.filter((u) => u.sub !== sub);
    });
  };

  useEffect(() => {
    const getUser = async (info) => {
      const res = await axios.post(BASE_URI + "get-info-meeting", {
        sub: info.sub,
        meetId: id,
      });
      if (res.data.status === 0) {
        return navigate("/", { replace: true });
      }
      if (res.data.status === 1) {
        setLoading(true);
        socket &&
          socket.emit("userPermissionToEnterMeeting", {
            meetingId: id,
            sub: info.sub,
            name: info.name,
            connId: socket?.id,
          });

        socket &&
          socket.on("responseRequestJoinMeeting", () => {
            setLoading(false);
            getUser(info);
            return;
          });
      }
      if (res.data?.user) {
        socket &&
          socket.emit("userConnect", {
            ...res.data.user,
            name: info.name,
            meetingId: id,
            owner: res.data.owner,
          });
        setCurrentUser({
          ...res.data.user,
          name: info.name,
          owner: res.data.owner,
        });
      }
    };

    if (!currentUser && socket) {
      getUser(info);
    }

    if (!info) {
      navigate("/", { replace: true });
    }
  }, [info, socket]);

  useEffect(() => {
    const SPD_func = (data, to_connid) => {
      socket &&
        socket.emit("SPDProcess", {
          message: data,
          to_connid: to_connid,
        });
    };
    if (socket && !firstLoad && currentUser) {
      setFirstLoad(true);
      AppProcess.init(SPD_func, socket.id);
      socket.on("connect", () => {
        console.log("socket connected to client side");
      });
    }
  });

  // useEffect(() => {
  //   if (currentUser && id && socket) {
  //     socket.emit("userConnect", {
  //       ...currentUser,
  //       name: currentUser.name,
  //       meetingId: id,
  //     });
  //   }
  // }, [socket, id, currentUser]);

  // useEffect(() =>{
  //   socket && socket.on("responseRequestJoinMeeting", () =>{
  //     setLoading(false);
  //   })
  // },[socket])

  useEffect(() => {
    socket &&
      socket.on("informOtherAboutMe", async (data) => {
        setUsers((pre) => [data, ...pre]);
        AppProcess.setNewConnection(data.connId);
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("informMeAboutOtherUser", async (otherUser = []) => {
        if (otherUser.length) {
          setUsers(() =>
            otherUser.map((o) => {
              AppProcess.setNewConnection(o.connectionId);
              return {
                ...o,
                otherUserId: o.userId,
                connId: o.connectionId,
              };
            })
          );
        }
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("SDPProcess", async (data) => {
        await AppProcess.processClientFunc(data.message, data.from_connid);
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("inFormAboutDisconnectedUser", (data) => {
        setUsers((pre) => pre.filter((p) => p.connId !== data.connId));
        AppProcess.closeConnectionCall(data.connId);
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("showChatMessage", (data) => {
        const time = new Date();
        const lTime = time.toLocaleString("vi-VN");

        setMessages((pre) => [...pre, { ...data, time: lTime }]);
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("showShareFile", (data) => {
        console.log(data);
        setListShareFile((pre) => [...pre, data]);
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("informUserVideoPermissions", (data) => {
        if (socket?.id === data.connId) {
          if (!data.stateVideo) {
            AppProcess.videoProcess(0);
          }
          setCurrentUser((pre) => {
            return {
              ...pre,
              video: data.stateVideo,
            };
          });
        } else {
          setUsers((pre) => {
            return pre.map((u) => {
              if (u.connId === data.connId) {
                return {
                  ...u,
                  video: data.stateVideo,
                };
              } else {
                return u;
              }
            });
          });
        }
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("informUserAudioPermissions", (data) => {
        if (socket?.id === data.connId) {
          if (!data.stateAudio) {
            AppProcess.muteAudio();
          }
          setCurrentUser((pre) => {
            return {
              ...pre,
              audio: data.stateAudio,
            };
          });
        } else {
          setUsers((pre) => {
            return pre.map((u) => {
              if (u.connId === data.connId) {
                return {
                  ...u,
                  audio: data.stateAudio,
                };
              } else {
                return u;
              }
            });
          });
        }
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("informUserChatPermissions", (data) => {
        if (socket?.id === data.connId) {
          setCurrentUser((pre) => {
            return {
              ...pre,
              chat: data.stateChat,
            };
          });
        } else {
          setUsers((pre) => {
            return pre.map((u) => {
              if (u.connId === data.connId) {
                return {
                  ...u,
                  chat: data.stateChat,
                };
              } else {
                return u;
              }
            });
          });
        }
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("informUserShareFilePermissions", (data) => {
        if (socket?.id === data.connId) {
          setCurrentUser((pre) => {
            return {
              ...pre,
              shareFile: data.stateShareFile,
            };
          });
        } else {
          setUsers((pre) => {
            return pre.map((u) => {
              if (u.connId === data.connId) {
                return {
                  ...u,
                  shareFile: data.stateShareFile,
                };
              } else {
                return u;
              }
            });
          });
        }
      });
  }, [socket]);

  useEffect(() => {
    if (socket) {
      socket.on("informUserRequestJoinMeeting", (data) => {
        setUserJoinMeet(data);
      });
    }
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("informUpdatePermissionsUser", (data) => {
        setCurrentUser((pre) => {
          if (pre.sub === data.sub) {
            return {
              ...pre,
              audio: true,
              video: true,
              chat: true,
              shareFile: true,
              owner: true,
            };
          }
          return pre;
        });
        setUsers((pre) => {
          return pre.map((u) => {
            if (u.sub === data.sub) {
              return {
                ...u,
                audio: true,
                video: true,
                chat: true,
                shareFile: true,
                owner: true,
              };
            }
            return u;
          });
        });
      });
  }, [socket]);
  useEffect(() => {
    socket &&
      socket.on("informUsersAddedToTheRoom", (data) => {
        setListRoom((pre) => [data, ...pre]);
      });
  }, [socket]);

  useEffect(() => {
    socket && socket.on("informInvitingUserOutRoom",()=>{
      handleLeaveMeeting();
    })
  },[socket])
  return (
    <>
      <ModalAddRoom
        visible={isShowModalAddRoom}
        users={users || []}
        onClose={() => setIsShowModalAddRoom(false)}
        onSubmit={handleAddRoom}
      />
      <ModalConfirm
        onClick={handleAcceptModalConfirm}
        onClose={handleCloseModalConfirm}
        visible={userJoinMeet}
        data={userJoinMeet}
      />
      {loading ? (
        <div
          className="fixed top-0 left-0 z-50 w-screen h-screen flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.3)" }}
        >
          <div className="bg-white border py-2 px-5 rounded-lg flex items-center flex-col">
            <div className="loader-dots block relative w-20 h-5 mt-2">
              <div className="absolute top-0 mt-1 w-3 h-3 rounded-full bg-green-500"></div>
              <div className="absolute top-0 mt-1 w-3 h-3 rounded-full bg-green-500"></div>
              <div className="absolute top-0 mt-1 w-3 h-3 rounded-full bg-green-500"></div>
              <div className="absolute top-0 mt-1 w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="text-gray-500 text-xs font-medium mt-2 text-center">
              Đã gửi yêu cầu vào phòng vui lòng đợi...
            </div>
          </div>
        </div>
      ) : (
        <main className=" flex flex-col  home-wrap">
          <div className="g-top flex  text-gray-100">
            <div className=" flex-1 top-remote-video-show-wrap overflow-auto  flex flex-wrap ] justify-center">
              <div
                id="me"
                className=" border bg-black w-1/2 flex flex-col justify-center userbox"
              >
                <h2 className="text-center text-base">
                  {currentUser?.name}(Tôi)
                </h2>
                <div className="border mx-auto">
                  <video
                    onDoubleClick={(e) => openFullscreen(e)}
                    autoPlay
                    muted
                    id="localVideoPlayer"
                  ></video>
                </div>
              </div>
              {users.map((u, i) => {
                return (
                  <div
                    key={i}
                    id="otherTemplate"
                    className=" border bg-black w-1/2 flex justify-center  flex-col userbox"
                  >
                    <h2 className="text-center text-base">{u.otherUserId}</h2>
                    <div className="self-center border mx-auto">
                      <video
                        onDoubleClick={(e) => openFullscreen(e)}
                        id={"v_" + u.connId}
                        autoPlay
                        muted
                        src=""
                      ></video>
                      <audio
                        id={"a_" + u.connId}
                        autoPlay
                        controls
                        className="hidden"
                      ></audio>
                    </div>
                  </div>
                );
              })}
              <div>
                {/* <div className="bg-black call-wrap  ">
              <div id="divUsers" className="flex flex-wrap video-wrap"></div>
            </div> */}
              </div>
            </div>

            {isShowDetail && (
              <div className="g-right-detail-wrap  z-50 bg-white text-gray-800 h-screen w-[20rem]  shrink-0">
                <div className="meeting-heading-wrap flex justify-between items-center px-3 h-[5vh]">
                  <div className="meeting-heading font-bold cursor-pointer">
                    Chi tiết cuộc họp
                  </div>
                  <div
                    onClick={() => setIsShowDetail(false)}
                    className="meeting-heading-cross display-center cursor-pointer"
                  >
                    <span className="material-icons">clear</span>
                  </div>
                </div>
                <div className="people-chat-wrap flex justify-between items-center text-sm mx-3 px-3 h-[5vh]">
                  <div
                    onClick={() => setIsShowChat(true)}
                    className={`${
                      isShowChat ? "border-b-2 border-sky-500" : ""
                    } people-heading display-center cursor-pointer transition`}
                  >
                    <div className="people-heading-icon display-center mr-1">
                      <span className="material-icons">people</span>
                    </div>
                    <div className="people-heading-text display-center">
                      Participant (
                      <span className="participant-count">
                        {1 + users.length}
                      </span>
                    </div>
                    )
                  </div>
                  <div
                    onClick={() => setIsShowChat(false)}
                    className={`${
                      !isShowChat ? "border-b-2 border-sky-500" : ""
                    } chat-heading flex justify-around	 items-center cursor-pointer transition`}
                  >
                    <div className="  chat-heading-icon display-center mr-1">
                      <span className="material-icons">message</span>
                    </div>
                    <div className="heading-text">Chat</div>
                  </div>
                </div>

                <div className="transition in-call-chat-wrap mx-3 px-3 text-sm h-[80vh] overflow-y-scroll my-3">
                  {isShowChat ? (
                    <div className="in-call-wrap-up space-y-2">
                      {!!listRoom.length && (
                        <div className="flex flex-col space-y-1">
                          <h3 className="text-sm font-bold">
                            Danh sách phòng bạn có thể tham gia
                          </h3>
                          {listRoom.map((l) => {
                            return (
                              <Link
                                target="_blank"
                                key={l}
                                to={BASE_URI_CLIENT + `meetingID/${l}`}
                                className="text-center focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 "
                              >
                                Phòng {" " + l}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                      <div className="in-call-wrap flex justify-between items-center mb-3">
                        <div className="participant-img-name-wrap display-center cursor-pointer">
                          <div className="participant-img">
                            <img
                              src="/other.jpg"
                              alt=""
                              className="border border-gray-800 h-[40px] w-[40px] rounded-[50%]"
                            />
                          </div>
                          <div className="participant-name ml-2">Tôi</div>
                        </div>
                      </div>
                      {users.map((u) => {
                        return (
                          <div
                            id={"participant_" + u.connId}
                            key={u.connId}
                            className="in-call-wrap flex justify-between items-center mb-3"
                          >
                            <div className="participant-img-name-wrap display-center cursor-pointer">
                              <div className="participant-img">
                                <img
                                  src="/other.jpg"
                                  alt=""
                                  className="border border-gray-800 h-[40px] w-[40px] rounded-[50%]"
                                />
                              </div>
                              <div className="participant-name ml-2">
                                {u.otherUserId}
                              </div>
                            </div>
                            {!u?.owner && currentUser.owner && (
                              <div className="participant-action-wrap display-center ">
                                <UserMenu
                                  user={u}
                                  id={id}
                                  handleChangeUserPerToAdmin={
                                    handleChangeUserPerToAdmin
                                  }
                                  handleChangeUserAudioPer={
                                    handleChangeUserAudioPer
                                  }
                                  handleChangeUserShareFilePer={
                                    handleChangeUserShareFilePer
                                  }
                                  handleChangeUserVideoPer={
                                    handleChangeUserVideoPer
                                  }
                                  handleChangeUserChatPer={
                                    handleChangeUserChatPer
                                  }
                                  handleInvitingUserOutRoom={
                                    handleInvitingUserOutRoom
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="chat-show-wrap text-gray-800 text-sm flex flex-col justify-between h-full">
                      <div
                        className="chat-message-show space-y-2"
                        id="messages"
                      >
                        {messages.map((m) => {
                          return (
                            <React.Fragment key={m.time}>
                              <div className="flex space-x-3 items-center">
                                <span className="font-medium text-base">
                                  {m.from}
                                </span>
                                <p className="text-xs text-gray-500">
                                  {m.time}
                                </p>
                              </div>
                              <p>{m.message}</p>
                            </React.Fragment>
                          );
                        })}
                      </div>

                      <div className="mb-[20px] chat-message-sent flex justify-between items-center">
                        {currentUser.chat && (
                          <>
                            <div className="chat-message-sent-input w-[85%]">
                              <input
                                ref={inputRef}
                                type="text"
                                name=""
                                id=""
                                placeholder="Nhập tin nhắn"
                                className="outline-none chat-message-sent-input-field w-full border-b-[1px] border-sky-500"
                              />
                            </div>
                            <div
                              onClick={handleSendMessage}
                              className="chat-message-sent-action display-center cursor-pointer text-sky-500"
                            >
                              <span className="material-icons">send</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-2  g-top-left w-[20rem] bg-gray-100 text-gray-600">
              <div
                onClick={handleShowDetailsParticipant}
                className="top-left-participant-wrap pt-2 cursor-pointer"
              >
                <div className="top-left-participant-icon">
                  <BsFillPeopleFill size={24} />
                </div>
                <div className="top-left-participant-count">
                  {1 + users.length}
                </div>
              </div>
              <div
                onClick={handleShowDetailsChat}
                className="top-left-chat-wrap pt-2 cursor-pointer"
              >
                <MdMessage size={24} />
              </div>
              {currentUser?.owner && (
                <div
                  onClick={() => setIsShowModalAddRoom(true)}
                  className="top-left-chat-wrap pt-2 cursor-pointer"
                >
                  <RiVideoAddFill size={24} />
                </div>
              )}
              <div className="top-left-time-wrap"></div>
            </div>
          </div>

          <div className="g-bottom z-50 px-5 transition bg-gray-100 m-0 flex justify-between items-center">
            <div className="bottom-left flex relative p-[5px]">
              {isShowDialog && (
                <div className="g-details border border-green-500 mb-2">
                  <div className="g-details-heading flex justify-between space-x-2 items-center border-b pb-1">
                    <div
                      onClick={() => setIsShowShareForm(false)}
                      className="g-details-heading-detail flex items-center cursor-pointer"
                    >
                      <span className="material-icons -mt-[5px]">error</span>
                      Chi tiết
                      <span></span>
                    </div>
                    <div
                      onClick={() => setIsShowShareForm(true)}
                      className="g-details-heading-attachment flex items-center cursor-pointer"
                    >
                      <span className="material-icons -mt-[5px]">
                        attachment
                      </span>
                      Đính kèm tập tin
                      <span></span>
                    </div>
                  </div>
                  <div className="g-details-heading-show-wrap">
                    {isShowShareForm ? (
                      <div className="g-details-heading-show-attachment relative">
                        <div className="show-attach-file overflow-x-hidden overflow-y-auto max-h-[3.5rem]">
                          {listShareFile.map((f, index) => {
                            return (
                              <div
                                key={index}
                                className="left-align flex items-center"
                              >
                                <img
                                  src="/other.jpg"
                                  className="h-[40px] w-[40px] caller-image rounded-full "
                                  alt=""
                                />
                                <div className="font-semibold mx-[5px] shrink-0">
                                  {f.userName}:
                                </div>
                                <div className="cursor-pointer line-clamp-1">
                                  <Link
                                    to={
                                      BASE_URI + `download/${id}/${f.fileName}`
                                    }
                                    className="text-[#007bff]"
                                    download={true}
                                    target="_blank"
                                  >
                                    {f.fileName}
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="upload-attach-file">
                          {currentUser.shareFile && (
                            <form
                              encType="multipart/form-data"
                              className="display-center pt-1"
                              id="uploadForm"
                            >
                              <div className="custom-file basis-[79%] ">
                                <input
                                  ref={fileRef}
                                  type="file"
                                  className="custom-file-input border "
                                  id="customFile"
                                  name="imageFile"
                                />
                              </div>
                              <div className="share-button-wrap">
                                <button
                                  onClick={handleShareFile}
                                  type="button"
                                  className="basis-[19%] share-attach text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2"
                                >
                                  Chia sẽ
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="g-details-heading-show">
                        <div className="font-semibold text-gray-500">
                          Thông tin tham gia
                        </div>
                        <div className="cursor-pointer">
                          <span className=" text-sky-600 font-medium">
                            {window.location.href}
                          </span>
                        </div>
                        <div
                          onClick={handleCopyClipBoard}
                          className="cursor-pointer"
                        >
                          <span className="material-icons text-sm">
                            content_copy
                          </span>
                          <span className="copy_info font-bold">
                            Sao chép thông tin tham gia
                          </span>
                        </div>
                        {isShowStatusCopy && (
                          <p className="text-purple-500 font-semibold">
                            Đã sao chép thông tin đường dẫn
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div
                onClick={() => setIsShowDialog((pre) => !pre)}
                className=" text-center cursor-pointer hover:opacity-80 meeting-details-button flex items-center space-x-2 "
              >
                <p>Chi tiết cuộc họp</p>

                <SlArrowDown size={12} />
              </div>
            </div>
            <div className="bottom-middle  flex space-x-4 justify-center items-center">
              <div
                id="miceMuteUnmute"
                className={`mic toggle wrap action-icon-style mr-2 cursor-pointer hover:opacity-80 ${
                  currentUser?.audio ? "visible" : "invisible"
                }`}
              >
                <span className="material-icons">mic_off</span>
              </div>
              <div
                onClick={handleLeaveMeeting}
                className="mr-2 cursor-pointer hover:opacity-80 text-center end-call-wrap action-icon-style"
              >
                <IoIosCall className="text-red-500" size={24} />
              </div>

              <div
                id="videoCamOff"
                className={`video-toggle-wrap action-icon-style text-center cursor-pointer hover:opacity-80 ${
                  currentUser?.video ? "visible" : "invisible"
                }`}
              >
                <span className="material-icons">videocam_off</span>
              </div>
            </div>

            <div className="bottom-0 right-0 flex justify-center items-center mr-3 ">
              <div
                id="btnScreenShare"
                className={`present-now-wrap flex justify-center flex-col items-center mr-5 cursor-pointer hover:opacity-80 ${
                  currentUser?.video ? "visible" : "invisible"
                }`}
              >
                <span className="material-icons">present_to_all</span>
                <div>Hiện tại</div>
              </div>
              <div className="option-wrap cursor-pointer hover:opacity-80 flex items-center h-[10vh] relative ">
                <div className="option-icon">
                  <FiMoreVertical size={24} />
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  );
}
