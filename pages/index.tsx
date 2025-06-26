import { useEffect, useState } from "react";
import SignClient from "@walletconnect/sign-client";
import TronWeb from "tronweb";

const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // 主网 USDT 合约地址
const RECEIVER = "TWonQDtwMakQgvZZQsLNLj7eAtZqJLJ7Hg";         // 替换为你要转账的接收地址
const AMOUNT = 1; // USDT 数量（整数）

export default function Home() {
  const [client, setClient] = useState<SignClient | null>(null);
  const [session, setSession] = useState<any>(null);
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    async function init() {
      try {
        const _client = await SignClient.init({
          projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
          metadata: {
            name: "TRON DApp",
            description: "TRON + WalletConnect v2",
            url: "https://your-dapp.com",
            icons: ["https://your-dapp.com/icon.png"],
          },
        });
        setClient(_client);
      } catch (error) {
        console.error("WalletConnect 初始化失败:", error);
      }
    }
    init();
  }, []);

  const connect = async () => {
    if (!client) return alert("WalletConnect 客户端未初始化");

    try {
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          tron: {
            methods: [
              "tron_signTransaction",
              "tron_sendRawTransaction",
              "tron_signMessage",
            ],
            chains: ["tron:mainnet"],
            events: ["chainChanged", "accountsChanged"],
          },
        },
      });

      if (uri) {
        window.open(`https://walletconnect.com/wc?uri=${encodeURIComponent(uri)}`, "_blank");
      }

      const _session = await approval();
      const account = _session.namespaces.tron.accounts[0];
      const addr = account.split(":")[2];
      setSession(_session);
      setAddress(addr);
    } catch (err) {
      console.error("连接钱包失败:", err);
    }
  };

  const transfer = async () => {
    if (!session || !client || !address) return alert("请先连接钱包");

    try {
      const tronWeb = new TronWeb({
        fullHost: "https://api.trongrid.io",
      });

      const amountSun = tronWeb.toSun(AMOUNT);
      const params = [
        { type: "address", value: RECEIVER },
        { type: "uint256", value: amountSun },
      ];

      const tx = await tronWeb.transactionBuilder.triggerSmartContract(
        tronWeb.address.toHex(USDT_CONTRACT),
        "transfer(address,uint256)",
        {},
        params,
        tronWeb.address.toHex(address)
      );

      const signedTx = await client.request({
        topic: session.topic,
        chainId: "tron:mainnet",
        request: {
          method: "tron_signTransaction",
          params: [tx.transaction],
        },
      });

      console.log("签名结果:", signedTx);
      alert("签名成功！交易已发送钱包确认。");
    } catch (err) {
      console.error("交易失败:", err);
      alert("发送交易失败");
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>WalletConnect v2 + TRON + Vercel</h2>
      <p>当前钱包地址: {address || "未连接"}</p>
      <button onClick={connect}>连接钱包</button>
      <button onClick={transfer} disabled={!address}>发送 USDT</button>
    </div>
  );
}
