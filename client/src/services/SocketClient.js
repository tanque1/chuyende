import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

export default function SocketClient() {
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
    socket &&
      socket.on("connect", () => {
        console.log("socket connected to client side");
      });
  }, [socket]);

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
      socket.on("informOtherAboutMe", (data) => {
        setUser((pre) => [data, ...pre]);
      });
  }, [socket]);
  return <></>;
}
