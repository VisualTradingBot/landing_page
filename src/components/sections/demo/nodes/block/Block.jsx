import "./block.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";

export default function Block({ data, id }) {
  return (
    <NodeDefault
      id={id}
      title={data?.label || "Block"}
    >
      <div className="block-container">
        {/* Empty content - just like SetParameter but without the input field */}
      </div>
    </NodeDefault>
  );
}

Block.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
