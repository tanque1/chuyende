import { useEffect, useState } from "react";
import {
  BsFillCameraVideoOffFill,
  BsFillPeopleFill,
  BsMicMuteFill,
} from "react-icons/bs";
import { FiMoreVertical } from "react-icons/fi";
import { IoIosCall } from "react-icons/io";
import { MdMessage, MdPresentToAll } from "react-icons/md";
import { SlArrowDown } from "react-icons/sl";
import { useParams } from "react-router-dom";
import { connect, io } from "socket.io-client";

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
    console.log(my_connid);
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
        ).innerHTML = `<span className="material-icons">mic</span>`;

        updateMediaSenders(audio, rtpAudSenders);
      } else {
        audio.enabled = false;

        document.getElementById(
          "miceMuteUnmute"
        ).innerHTML = `<span className="material-icons">mic_off</span>`;

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
        if(rtpSenders[conID] && rtpSenders[conID].track){
          rtpSenders[conID].replaceTrack(track);
        }else {
          rtpSenders[conID] = peers_connection[conID].addTrack(track)
        }
      }
    }
  }

  async function videoProcess(newVideoState) {
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
  }

  const iceConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
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
        remoteAudioPlayer.srcObject = remote_vid_stream[connId];
        remoteAudioPlayer.load();
      }
    };
    peers_connection_ids[connId] = connId;
    peers_connection[connId] = connection;
    return connection;
    if (videoSt === videoStates.Camera || videoSt === videoStates.ScreenShare) {
      if (videoCamTrack) {
        updateMediaSenders(videoCamTrack, rtpVidSenders);
      }
    }
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
  };
})();

export default function Meeting() {
  const [socket, setSocket] = useState(null);
  const { id } = useParams();
  const [userName, setUserName] = useState("Tan que");
  const [users, setUser] = useState([]);
  // useEffect(() => {
  //   if (!userName) {
  //     setUserName(() => {
  //       return window.prompt("Vui lòng nhập họ tên");
  //     });
  //   }
  // }, []);

  useEffect(() => {
    setSocket(() => io("http://localhost:5000"));
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
    if (socket?.connected === true) {
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
  return (
    <main className=" flex flex-col  home-wrap">
      <div className="g-top text-gray-100">
        <div className="top-remote-video-show-wrap container mx-auto mt-32 flex flex-wrap h-[600px] justify-center">
          <div
            id="me"
            className=" border bg-black w-1/2 flex flex-col justify-center userbox"
          >
            <h2 className="text-center text-base">{userName}</h2>
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
                    muted
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
      <div className="g-bottom  px-5 transition bg-gray-100 m-0 flex justify-between items-center">
        <div className="bottom-left flex ">
          <div
            id="btnScreenShare"
            className=" text-center cursor-pointer hover:opacity-80 meeting-details-button flex items-center"
          >
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
          <div className="present-now-wrap flex justify-center flex-col items-center mr-5 cursor-pointer hover:opacity-80">
            <MdPresentToAll size={24} />
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
