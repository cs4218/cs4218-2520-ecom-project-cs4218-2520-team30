import { useState,useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from 'axios';
// import { set } from "mongoose"; // Leong Soon Mun Stephane, A0273409B
import Spinner from "../Spinner";

export default function PrivateRoute(){
    const [ok,setOk] = useState(false)
    const [auth,setAuth] = useAuth()

    useEffect(()=> {
        const authCheck = async () => {
            try { // Leong Soon Mun Stephane, A0273409B
                const res = await axios.get("/api/v1/auth/user-auth");
                if (res.data.ok) {
                    setOk(true);
                } else {
                    setOk(false);
                }
            } catch (error) { // Leong Soon Mun Stephane, A0273409B
                console.log(error) // Leong Soon Mun Stephane, A0273409B
            }
        };
        if (auth?.token) authCheck();
    }, [auth?.token]);

    return ok ? <Outlet /> : <Spinner path=""/>;
}