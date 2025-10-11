import "./indicator.scss";
import NodeDefault from "../nodeDefault";

export default function Indicator() {
  return (
    <NodeDefault title="Indicator Node" bottom={true} top={true}>
      <select>
        <option value="average">Average</option>
      </select>
    </NodeDefault>
  );
}
