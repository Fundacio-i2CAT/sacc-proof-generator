import React from "react";
import axios from "axios";

import "./App.css";
import vk_proof from "./vk-proof.json";

const bigInt = require("big-integer");
const WitnessCalculatorBuilder = require("circom_runtime")
  .WitnessCalculatorBuilder;
const snarkjs = require("snarkjs");

const root =
  process.env.REACT_APP_PRODUCTION === "true"
    ? `${process.env.REACT_APP_BACKEND_PROTOCOL}://${process.env.REACT_APP_BACKEND_DOMAIN}/${process.env.REACT_APP_BACKEND_PATH}`
    : `${process.env.REACT_APP_BACKEND_PROTOCOL}://${process.env.REACT_APP_BACKEND_DOMAIN}:${process.env.REACT_APP_BACKEND_PORT}`;

class App extends React.Component {
  state = {
    key: null,
    value: null,
    root: null,
    siblings: [],
    topics: [],
    address: null,
    proofGenerated: false,
    isGeneratingProof: false,
  };

  handleLoadData = () => {
    this.setState({
      key: bigInt(window.key).value,
      value: bigInt(window.value).value,
      root: bigInt(window.root).value,
      siblings: window.siblings.split(",").map((s) => bigInt(s).value),
      topics: window.topics.split(",").map((t) => bigInt(t).value),
      address: bigInt(window.address).value,
      topicNames: window.topicNames.split(","),
    });
  };

  handleGenerateProof = () => {
    this.setState(
      {
        isGeneratingProof: true,
      },
      async () => {
        const circuit = await axios.get(`${root}/circuit`);
        const wasm = Buffer.from(circuit.data.wasmAsArray, "hex");
        const c_wasm = await WitnessCalculatorBuilder(wasm, {
          sanityCheck: true,
        });
        const w = await c_wasm.calculateWitness({
          key: this.state.key,
          value: this.state.value,
          root: this.state.root,
          siblings: this.state.siblings,
          topics: this.state.topics,
          address: this.state.address,
        });
        const withBigInts = JSON.parse(JSON.stringify(vk_proof), (k, v) =>
          k === "protocol" ||
          v === null ||
          typeof v === "number" ||
          typeof v === "object"
            ? v
            : bigInt(v).value
        );
        const { proof, publicSignals } = snarkjs.groth.genProof(withBigInts, w);
        await axios.post(`${root}/topic`, {
          // proof,
          // publicSignals,
          topicNames: this.state.topicNames,
        });
        this.setState({
          proofGenerated: true,
          isGeneratingProof: false,
        });
      }
    );
  };

  render() {
    return this.state.proofGenerated ? (
      <div className="Success">Zero knowledge proof successfuly generated!</div>
    ) : this.state.isGeneratingProof ? (
      <>
        <div className="Message">
          Generating zero knowledge proof, please wait...
        </div>
        <div className="Message">Please, do not navigate to other screens!</div>
      </>
    ) : (
      <div>
        <button className="Button" onClick={this.handleLoadData}>
          Load Data
        </button>
        <button
          className="Button"
          disabled={this.state.key === null}
          onClick={this.handleGenerateProof}
        >
          Generate Zero Knowledge Proof
        </button>
        {this.state.key === null ? (
          <p className="Message">Please, tab on Load Data!</p>
        ) : (
          <>
            <p className="SectionTitle">{`Key ${this.state.key}`}</p>
            <p className="SectionTitle">{`Value ${this.state.value}`}</p>
            <p className="SectionTitle">{`Root ${this.state.root}`}</p>
            <p className="SectionTitle">{`Address ${this.state.address}`}</p>
            <div className="ElementContainer">
              <p className="SectionTitle">{`Topics`}</p>
              {this.state.topics.map((e, i) => (
                <p className="ElementText" key={i}>{`Topic ${i}: ${e}`}</p>
              ))}
            </div>
            <div className="ElementContainer">
              <p className="SectionTitle">{`Siblings`}</p>
              {this.state.siblings.map((e, i) => (
                <p className="ElementText" key={i}>{`Sibling ${i}: ${e}`}</p>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
}

export default App;
