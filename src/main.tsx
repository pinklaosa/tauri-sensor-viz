import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AddSensorWindow from "./components/AddSensorWindow";
import PredictiveModelBuild from "./components/PredictiveModelBuild";
import FailureGroupCreation from "./components/FailureGroupCreation";
import "./App.css";

const urlParams = new URLSearchParams(window.location.search);
const windowType = urlParams.get("window");

let RootComponent = App;

if (windowType === "add-sensor") {
  RootComponent = AddSensorWindow;
} else if (windowType === "predictive-model") {
  RootComponent = PredictiveModelBuild;
} else if (windowType === "failure-group") {
  RootComponent = FailureGroupCreation;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
