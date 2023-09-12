import React, { ReactElement, useContext, useMemo } from "react";
import { Layer, ListItem } from "../../virtualTree";
import { VirtualTreeContext } from "./virtualTreeContext";

export interface LayerChildrenComponentProps<T> {
  layer: Layer;
  listItem: ListItem;
  sample: boolean;
  onInitHeight: (height: number) => void;
  props?: T;
}

interface LayerComponentProps<T> {
  children: (props: LayerChildrenComponentProps<T>) => ReactElement;
  layer: Layer;
  listItem: ListItem;
  getComponentProps?: (index: number) => T;
}

export const getLevel = (layer: Layer, level: number = 0): number => {
  if (layer.parent) {
    return getLevel(layer.parent, level + 1);
  } else {
    return level;
  }
};

export const LayerComponent = <T,>({ children, layer, listItem, getComponentProps }: LayerComponentProps<T>) => {
  const { offset, root, ready } = useContext(VirtualTreeContext);

  const onInitHeight = (height: number) => {
    const level = getLevel(layer);
    const layers = layer.getLayersByLevel(level + 1);

    layers.forEach((layer) => {
      layer.listItem.height = height;
    });
  };

  const visibleSlice = useMemo(() => {
    return root.getSlice(...offset);
  }, [offset]);

  const getProps = (index: number): LayerChildrenComponentProps<T> => {
    return {
      layer: layer.children[index],
      listItem: listItem.children[index],
      props: getComponentProps ? getComponentProps(index) : undefined,
      onInitHeight,
      sample: false,
    };
  };

  const getSampleProps = () => {
    return { ...getProps(0), sample: true };
  };

  const isVisible = (item: ListItem) => {
    return !!visibleSlice.find((visibleItem) => visibleItem.compare(item));
  };

  const noProps = (index: number) => {
    return getComponentProps !== undefined && getComponentProps(index) === undefined;
  };

  const Component = useMemo(() => {
    return children;
  }, []);

  return (
    <>
      {!ready && layer.children.length !== 0 && children(getSampleProps())}
      {layer.children.map((item, index) => {
        return isVisible(item.listItem) && !noProps(index) && item.listItem.height > 0 ? (
          <Component key={item.listItem.id} {...getProps(index)} />
        ) : null;
      })}
    </>
  );
};
