import React, { useEffect, useRef, useState } from "react";
import { BsFillPeopleFill } from "react-icons/bs";
import { FiMoreVertical } from "react-icons/fi";
import { IoIosCall } from "react-icons/io";
import { MdMessage } from "react-icons/md";
import { SlArrowDown } from "react-icons/sl";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

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
        vstream.oninactive = (e) => {
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
  };
})();

export default function Meeting() {
  const [socket, setSocket] = useState(null);
  const { id } = useParams();
  const [userName, setUserName] = useState("Tan que");
  const [users, setUser] = useState([]);
  const [firstLoad, setFirstLoad] = useState(false);
  const [messages, setMessages] = useState([]);
  const inputRef = useRef();
  // useEffect(() => {
  //   if (!userName) {
  //     setUserName(() => {
  //       return window.prompt("Vui lòng nhập họ tên");
  //     });
  //   }
  // }, []);

  const handleSendMessage = () => {
    if (!inputRef.current.value) return;
    const time = new Date();
    const lTime = time.toLocaleString("vi-VN");
    const data = {
      time: lTime,
      message: inputRef.current.value,
      from: "Bạn",
    };
    setMessages((pre) => [{ ...data, time: lTime }, ...pre]);

    socket.emit("sendMessage", inputRef.current.value);
    inputRef.current.value = "";
  };

  useEffect(() => {
    setSocket(() => io("https://meeting-40.onrender.com"));
    return () => {
      socket && socket.close();
    };
  }, []);

  useEffect(() => {
    const SPD_func = (data, to_connid) => {
      socket &&
        socket.emit("SPDProcess", {
          message: data,
          to_connid: to_connid,
        });
    };
    if (socket && !firstLoad) {
      setFirstLoad(true);
      AppProcess.init(SPD_func, socket.id);
      socket.on("connect", () => {
        console.log("socket connected to client side");
      });
    }
  });

  useEffect(() => {
    if (userName && id) {
      socket &&
        socket.emit("userConnect", {
          displayName: userName,
          meetingId: id,
        });
    }
  }, [socket, userName, id]);

  useEffect(() => {
    socket &&
      socket.on("informOtherAboutMe", async (data) => {
        setUser((pre) => [data, ...pre]);
        AppProcess.setNewConnection(data.connId);
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("informMeAboutOtherUser", async (otherUser = []) => {
        if (otherUser.length) {
          setUser(() =>
            otherUser.map((o) => {
              AppProcess.setNewConnection(o.connectionId);
              return {
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
        setUser((pre) => pre.filter((p) => p.connId !== data.connId));
        AppProcess.closeConnectionCall(data.connId);
      });
  }, [socket]);

  useEffect(() => {
    socket &&
      socket.on("showChatMessage", (data) => {
        const time = new Date();
        const lTime = time.toLocaleString("vi-VN");

        setMessages((pre) => [{ ...data, time: lTime }, ...pre]);
      });
  }, [socket]);

  console.log(messages);
  return (
    <main className=" flex flex-col  home-wrap">
      <div className="g-top text-gray-100">
        <div className="top-remote-video-show-wrap container mx-auto mt-32 flex flex-wrap h-[600px] justify-center">
          <div
            id="me"
            className=" border bg-black w-1/2 flex flex-col justify-center userbox"
          >
            <h2 className="text-center text-base">{userName}(Me)</h2>
            <div className="border mx-auto">
              <video autoPlay muted id="localVideoPlayer"></video>
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
                  <video id={"v_" + u.connId} autoPlay muted src=""></video>
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

        <div className="g-right-detail-wrap fixed z-30 right-0 top-0 bottom-0  bg-white text-gray-800 h-full w-[20rem]">
          <div className="meeting-heading-wrap flex justify-between items-center px-3 h-[10vh]">
            <div className="meeting-heading font-bold cursor-pointer">
              Chi tiết cuộc họp
            </div>
            <div className="meeting-heading-cross display-center cursor-pointer">
              <span className="material-icons">clear</span>
            </div>
          </div>
          <div className="people-chat-wrap flex justify-between items-center text-sm mx-3 px-3 h-[10vh]">
            <div className="people-heading display-center cursor-pointer">
              <div className="people-heading-icon display-center mr-1">
                <span className="material-icons">people</span>
              </div>
              <div className="people-heading-text display-center">
                Participant (<span className="participant-count">1</span>
              </div>
              )
            </div>
            <div className="chat-heading flex justify-around	 items-center cursor-pointer">
              <div className="chat-heading-icon display-center mr-1">
                <span className="material-icons">message</span>
              </div>
              <div className="heading-text">Chat</div>
            </div>
          </div>

          <div className="in-call-chat-wrap mx-3 px-3 text-sm h-[69vh] overflow-y-scroll">
            <div className="in-call-wrap-up hidden"></div>
            <div className="chat-show-wrap text-gray-800 text-sm flex flex-col justify-between h-full">
              <div className="chat-message-show" id="messages">
                {messages.map((m) => {
                  return (
                    <React.Fragment key={m.time}>
                      <div  className="flex space-x-3 items-center">
                        <span className="font-medium text-base">{m.from}</span>
                        <p className="text-xs text-gray-500">{m.time}</p>
                      </div>
                      <p>{m.message}</p>
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="mb-[20px] chat-message-sent flex justify-between items-center">
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
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-2  g-top-left w-[20rem] bg-gray-100 text-gray-600">
          <div className="top-left-participant-wrap pt-2 cursor-pointer">
            <div className="top-left-participant-icon">
              <BsFillPeopleFill size={24} />
            </div>
            <div className="top-left-participant-count">2</div>
          </div>
          <div className="top-left-chat-wrap pt-2 cursor-pointer">
            <MdMessage size={24} />
          </div>
          <div className="top-left-time-wrap"></div>
        </div>
      </div>

      <div className="g-bottom z-50 px-5 transition bg-gray-100 m-0 flex justify-between items-center">
        <div className="bottom-left flex ">
          <div className=" text-center cursor-pointer hover:opacity-80 meeting-details-button flex items-center">
            <p>Chi tiết cuộc họp</p>
            <SlArrowDown size={12} />
          </div>
        </div>
        <div className="bottom-middle  flex space-x-4 justify-center items-center">
          <div
            id="miceMuteUnmute"
            className="mic toggle wrap action-icon-style mr-2 cursor-pointer hover:opacity-80"
          >
            <span className="material-icons">mic_off</span>
          </div>
          <div className="mr-2 cursor-pointer hover:opacity-80 text-center end-call-wrap action-icon-style">
            <IoIosCall className="text-red-500" size={24} />
          </div>
          <div
            id="videoCamOff"
            className="video-toggle-wrap action-icon-style text-center cursor-pointer hover:opacity-80"
          >
            <span className="material-icons">videocam_off</span>
          </div>
        </div>
        <div className="bottom-0 right-0 flex justify-center items-center mr-3 ">
          <div
            id="btnScreenShare"
            className="present-now-wrap flex justify-center flex-col items-center mr-5 cursor-pointer hover:opacity-80"
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
  );
}
