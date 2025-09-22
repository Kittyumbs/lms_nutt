import { Column } from "../types/kanban";

export const initialColumns: Column[] = [
  {
    id: "todo",
    title: "TO DO",
    tickets: [],
  },
  {
    id: "inprogress",
    title: "IN PROGRESS",
    tickets: [],
  },
  {
    id: "done",
    title: "DONE",
    tickets: [],
  },
];