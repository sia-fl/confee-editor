// @ts-ignore
import v2 from './hiddenPart.txt?raw';

export const QUERY_EDITOR_HEADER_DELIMITER =
  '\n/* __QUERY_EDITOR_HEADER_DELIMITER__ */\n';

export const makeQueryEditorHeader = () => {
  return v2.trim() + QUERY_EDITOR_HEADER_DELIMITER;
};
