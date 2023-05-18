import { useRef } from "react";
import { HiOutlineVideoCamera } from "react-icons/hi";
import { BsKeyboard } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { BASE_URI } from "../../../utils/constant";
import { toast } from "react-toastify";
export default function Main() {
  const ref = useRef();
  const navigate = useNavigate();
  const { socket } = useSelector((state) => state.connection);
  const { info } = useSelector((state) => state.user);
  const handleJoinMeet = () => {
    navigate(`/meetingID/${ref.current.value}`);
  };

  const handleNewMeeting = async () => {
    try {
      const meetingID = Math.floor(Math.random() * 100000);
      if (info) {
        const res = await axios.post(BASE_URI + "create-meeting", {
          owner: info.sub,
          meetId: meetingID,
          sub: info.sub
        });
        navigate(`/meetingID/${meetingID}`,{ state: { owner: true } });
      } else {
        toast.error("Vui lòng đăng nhập");
      }
    } catch (error) {}
  };

  return (
    <div className="container mx-auto flex p-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-medium">
          Tính năng họp và gọi video dành cho tất cả mọi người.
        </h1>
        <p className="text-gray-600">
          Google Meet là một dịch vụ cung cấp tính năng họp và gọi video bảo
          mật, chất lượng cao cho mọi người, trên mọi thiết bị.
        </p>
        <ul className="flex w-full items-center space-x-2">
          <li>
            <button
              onClick={handleNewMeeting}
              type="button"
              className="space-x-2 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded text-sm px-5 py-2.5 text-center inline-flex items-center mr-2 "
            >
              <HiOutlineVideoCamera size={24} />
              <span>Bắt đầu cuộc họp</span>
            </button>
          </li>
          <li className="font-semibold">Hoặc</li>
          <li>
            <div className="relative flex flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <BsKeyboard size={22} />
              </div>
              <input
                ref={ref}
                type="text"
                id="input-group-1"
                className=" border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 px-5 py-3 "
                placeholder="Mã cuộc họp"
              />
              <button
                onClick={handleJoinMeet}
                className="shrink-0 ml-2 font-semibold text-gray-400"
              >
                Tham Gia
              </button>
            </div>
          </li>
        </ul>
      </div>
      <div className="">
        <img src="google-meet-people.jpg" alt="" />
      </div>
    </div>
  );
}
