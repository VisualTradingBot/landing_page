import "./execute.scss";
import NodeDefault from "../nodeDefault";

export default function Execute() {
  return (
    <NodeDefault
      title="Execute Node"
      left={{ active: true, type: "target" }}
      right={{ active: true, type: "source" }}
    >
      <div className="box"></div>
    </NodeDefault>
  );
}
