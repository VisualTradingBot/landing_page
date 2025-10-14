import "./setParameter.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";

export default function SetParameter({ data, id }) {
  return (
    <NodeDefault id={id} title={data.label}>
      <ul className="parameter-list">
        <li>
          <span className="param-name">close</span>
        </li>
      </ul>
    </NodeDefault>
  );
}

SetParameter.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
