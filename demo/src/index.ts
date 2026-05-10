import express, { type Request, type Response } from "express";
import { DBType } from "@iriskaik/yaoi";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", driver: DBType.POSTGRES });
});

app.listen(PORT, () => {
  console.log(`Demo server listening on http://localhost:${PORT}`);
});
