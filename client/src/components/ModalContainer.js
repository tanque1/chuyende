import React from "react";
import ReactPortal from "./ReactPortal";

export default function ModalContainer({
  children,
  ignoreContainer,
  visible,
  onClose,
  className=""
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (!onClose) return;
    if (e.target.id === "modal-container") onClose && onClose();
  };
  const renderChildren = () => {
    if (ignoreContainer) return children;
    return (
      <div
        className={` bg-white rounded lg:w-[45rem] w-[30rem] 
      h-[40rem] overflow-auto p-3 ${className}` }
      >
        {children}
      </div>
    );
  };
  if (!visible) return null;
  return (
    <ReactPortal>
      <div
        onClick={handleClick}
        id="modal-container"
        className="fixed inset-0  z-50
      dark:bg-opacity-50 bg-opacity-50 bg-black 
      backdrop-blur-sm flex items-center justify-center"
      >
        {renderChildren()}
      </div>
    </ReactPortal>
  );
}
