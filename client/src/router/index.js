import{createBrowserRouter} from "react-router-dom"
import Home from "../pages/Home"
import Meeting from "../pages/Meeting"

export default createBrowserRouter([
    {
        path:"/",
        element:<Home/>
    },
    {
        path:"meetingID/:id",
        element:<Meeting/>
    }
])