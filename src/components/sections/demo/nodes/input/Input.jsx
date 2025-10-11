import "./input.scss";
import NodeDefault from "../nodeDefault";

export default function Input() {
  return (
    <NodeDefault title="Input Node" bottom={true}>
      <select>
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
      </select>
    </NodeDefault>
  );
}
