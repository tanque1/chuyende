import React, { useState } from "react";

export default function UserMenu({
  user={},
  handleChangeUserAudioPer=null,
  handleChangeUserChatPer=null,
  handleChangeUserVideoPer=null,
  handleChangeUserShareFilePer = null,
  handleChangeUserPerToAdmin = null,
  handleInvitingUserOutRoom = null,
    id=""
}) {
    const [isDropDown,setIsDropDown] = useState(false)
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsDropDown((pre) => !pre);
      }}
      className="relative   participant-action-dot display-center mr-2 cursor-pointer"
    >
      <span className="material-icons">more_vert</span>
      {isDropDown && (
        <div className="z-30 bg-white divide-y divide-gray-100 rounded-lg shadow w-44 absolute right-4 top-6 drop-shadow-lg">
          <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
            <li
              onClick={() => handleChangeUserVideoPer(user.connId, id, user.video)}
              className="block px-4 py-2 hover:bg-gray-100 "
            >
              {user.video ? "Tắt Video" : "Mở Video"}
            </li>
            <li
              onClick={() => handleChangeUserAudioPer(user.connId, id, user.audio)}
              className="block px-4 py-2 hover:bg-gray-100 "
            >
              {user.audio ? "Tắt Audio" : "Mở Audio"}
            </li>
            <li
              onClick={() => handleChangeUserChatPer(user.connId, id, user.chat)}
              className="block px-4 py-2 hover:bg-gray-100 "
            >
              {user.chat ? "Tắt Chat" : "Mở Chat"}
            </li>
            <li
              onClick={() =>
                handleChangeUserShareFilePer(user.connId, id, user.shareFile)
              }
              className="block px-4 py-2 hover:bg-gray-100 "
            >
              {user.shareFile ? "Tắt chia sẽ file" : "Mở chia sẽ file"}
            </li>
            <li
              onClick={() =>
                handleChangeUserPerToAdmin(user.connId, id,user.sub)
              }
              className="block px-4 py-2 hover:bg-gray-100 "
            >
              Bổ nhiệm chủ phòng
            </li>
            <li
              onClick={() =>
                handleInvitingUserOutRoom(user.connId, id,user.sub)
              }
              className="block px-4 py-2 hover:bg-gray-100 "
            >
              Mời ra khỏi phòng
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
