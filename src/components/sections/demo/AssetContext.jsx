import { createContext, useContext } from "react";

// Create Asset Context
export const AssetContext = createContext();

// Custom hook to use asset context
export const useAsset = () => {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAsset must be used within an AssetProvider');
  }
  return context;
};

