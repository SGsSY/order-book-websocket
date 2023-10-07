import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";

const mappingSnapshot = (data) => {
    const bidMap = new Map();
    const askMap = new Map();

    data.bids.forEach((item) => {
        const [price, size] = item;
        bidMap.set(price, size);
    });

    data.asks.forEach((item) => {
        const [price, size] = item;
        askMap.set(price, size);
    });

    return [bidMap, askMap];
};

const mappingDelta = (map, data) => {
    data.forEach((item) => {
        const [price, size] = item;
        if (map.has(price)) {
            const originSize = map.get(price);
            map.set(price, +originSize + +size);
        } else {
            map.set(price, size);
        }
    });

    return map;
};

function App() {
    const queryClient = useQueryClient();
    const { data: bids } = useQuery("BTCPFC-bids", () => {});
    const { data: asks } = useQuery("BTCPFC-asks", () => {});

    console.log(bids, asks);

    useEffect(() => {
        const webSocket = new WebSocket("wss://ws.btse.com/ws/oss/futures");
        webSocket.onopen = () => {
            console.log("connected");

            webSocket.send(
                JSON.stringify({
                    op: "subscribe",
                    args: ["update:BTCPFC"],
                })
            );
        };
        webSocket.onmessage = (event) => {
            // console.log(event.data);

            const response = JSON.parse(event.data);
            const data = response.data;

            // TODO: check seqNum and prevSeqNum, if not match, resubscribe topic
            // const {seqNum, prevSeqNum} = data;

            if (data.type === "snapshot") {
                console.log("snapshot");
                const [bidMap, askMap] = mappingSnapshot(data);
                queryClient.setQueryData("BTCPFC-bids", bidMap);
                queryClient.setQueryData("BTCPFC-asks", askMap);
            } else if (data.type === "delta") {
                console.log("delta");
                queryClient.setQueryData("BTCPFC-bids", (oldData) => {
                    return mappingDelta(oldData, data.bids);
                });
                queryClient.setQueryData("BTCPFC-asks", (oldData) => {
                    return mappingDelta(oldData, data.asks);
                });
            }
        };
        webSocket.onclose = () => {
            console.log("disconnected");
        };
        return () => {
            webSocket.close();
        };
    }, [queryClient]);

    const bidsMaxEight = Array.from(bids || [])
        .sort((a, b) => b[0] - a[0])
        .slice(0, 8);
    const asksMaxEight = Array.from(asks || [])
        .sort((a, b) => b[0] - a[0])
        .slice(0, 8);

    return (
        <>
            <h1>Vite + React</h1>
            <div>
                {bidsMaxEight.map(([price, size]) => (
                    <p key={price}>
                        <span>Price: {price}</span>
                        <span>Size: {size}</span>
                    </p>
                ))}
                {asksMaxEight.map(([price, size]) => (
                    <p key={price}>
                        <span>Price: {price}</span>
                        <span>Size: {size}</span>
                    </p>
                ))}
            </div>
        </>
    );
}

export default App;
