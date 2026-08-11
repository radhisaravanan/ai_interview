import React from "react";
import { Navigate, useLocation } from "react-router-dom";


const STAGE_ROUTES = {

  1: "/register",

  2: "/login",

  3: "/resume",

  4: "/permissions",

  5: "/dashboard",

  6: "/interview",

  7: "/report",

};



export const StageGuard = ({ children, requiredStage }) => {


  const location = useLocation();


  // Authentication token

  const userToken = localStorage.getItem("auth_token");



  // Current completed stage

  let highestCompletedStage = parseInt(

    localStorage.getItem("highest_stage") || "1",

    10

  );



  // Safety check

  if (isNaN(highestCompletedStage)) {

    highestCompletedStage = 1;

  }



  /*
    Login/Register stages
    Stage 1 and 2 don't require token
  */

  if (requiredStage > 2 && !userToken) {


    return (

      <Navigate

        to="/login"

        replace

        state={{

          from: location.pathname,

        }}

      />

    );

  }




  /*
    Prevent skipping steps

    Example:
    User directly opens /interview
    without completing resume
  */

  if (requiredStage > highestCompletedStage) {


    const redirectPath =
      STAGE_ROUTES[highestCompletedStage] || "/login";



    return (

      <Navigate

        to={redirectPath}

        replace

      />

    );

  }




  /*
    Prevent invalid stage access
  */

  if (

    !requiredStage ||

    !STAGE_ROUTES[requiredStage]

  ) {


    return (

      <Navigate

        to="/login"

        replace

      />

    );

  }





  return children;


};