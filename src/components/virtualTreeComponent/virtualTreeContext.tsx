import React, { createContext, useCallback, useEffect, useState } from "react";
import { Layer, ListItem, VirtualTree } from "../../virtualTree";
import { VirtualTreeProviderProps, Wrapper } from "./index";

export interface VirtualTreeContextInterface {
  root: VirtualTree;
  offset: [number, number];
  ready: boolean;
  setReady: (ready: boolean) => void;
  layer: Layer;
  listItem: ListItem;
  setListItem: (listItem: ListItem) => void;
  setLayer: (layer: Layer) => void;
  reInit: (listItem: ListItem, layer: Layer) => void;
}

const root = new VirtualTree();
export const ROOT_ID = "root";

export const VirtualTreeContext = createContext<VirtualTreeContextInterface>({
  root,
  offset: [0, 0],
  ready: false,
  setReady: () => {},
  listItem: new ListItem(ROOT_ID),
  layer: new Layer(new ListItem(ROOT_ID)),
  setListItem: () => {},
  setLayer: () => {},
  reInit: () => {},
});

export const VirtualTreeProvider = ({ children, height, className }: VirtualTreeProviderProps) => {
  const [draw, setDraw] = useState<boolean>(true);
  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  const [ready, setReady] = useState<boolean>(false);
  const [listItem, setListItem] = useState<ListItem>(new ListItem(ROOT_ID));
  const [layer, setLayer] = useState<Layer>(new Layer(listItem));

  useEffect(() => {
    return root.onOffset(setOffset);
  }, []);

  const reInit = useCallback((listItem: ListItem, layer: Layer) => {
    setListItem(listItem);
    setLayer(layer);
    setReady(false);
    setOffset([0, 0]);
    setDraw(false);
  }, []);

  useEffect(() => {
    setDraw(true);
  }, [listItem]);

  useEffect(() => {
    return listItem.onChildrenReady(() => {
      listItem.height = 0;
      root.update(listItem);
      root.ready();
      setReady(true);
    });
  }, []);

  return (
    <VirtualTreeContext.Provider
      value={{ root, offset, ready, setReady, layer, listItem, setListItem, setLayer, reInit }}
    >
      <Wrapper virtualTree={root} height={height} className={className}>
        {draw && children}
      </Wrapper>
    </VirtualTreeContext.Provider>
  );
};
