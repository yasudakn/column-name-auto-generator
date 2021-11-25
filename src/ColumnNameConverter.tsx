import React, {
  ChangeEvent,
  FC,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useCollapse from "react-collapsed";
import DownloadLink from "react-download-link";
import csvParse from "csv-parse/lib/sync";
import * as iconv from "iconv-lite";
import axios from "axios";
import "./ColumnNameConverter.css";

type TranslateRequest = {
  project_id: string;
  text: string;
  casing: string;
};
type TranslatedText = {
  index: number;
  origin: string;
  translated_text?: string;
  error?: string;
  dtype?: string;
};
const translate_postproc = (translated_text: string) => {
  // 先頭の数字,記号の取り除き
  let post = translated_text.replace(/^([^a-z]*)([a-z]*)/i, "$2");
  // 変換不可の日本語の取り除き
  // eslint-disable-next-line
  post = post.replace(/([^\x01-\x7E]+)/g, "");
  return post;
};

const ColumnNameConverter: FC = () => {
  const urls = {
    translate: "/v1/engine/translate.json",
    createTable: "/create",
  };
  const requestBase: TranslateRequest = {
    project_id: process.env.REACT_APP_CODIC_PROJECT_ID || "missing", // codic project id
    text: "",
    casing: "lower underscore",
  };
  const codicUrl = process.env.REACT_APP_CODIC_URL;
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  let request = requestBase;
  const [translatedHeaders, setTranslatedHeaders] = useState<TranslatedText[]>(
    []
  );
  const [createTableStatus, setCreateTableStatus] = useState("");
  const [createTableFields, setCreateTableFields] = useState("");
  const [originHeaders, setOriginHeaders] = useState<string[]>([]);
  const [tableName, setTableName] = useState("my_table");
  const requestMaxLength = Number(
    process.env.REACT_APP_CODIC_API_REQUEST_MAX_LENGTH
  );
  const { getCollapseProps, getToggleProps, isExpanded } = useCollapse();

  const handleTriggerReadFile = () => {
    if (fileInput.current) {
      fileInput.current.click();
    }
  };
  const handleReadFile = (fileObj?: File) => {
    if (fileObj) {
      setFile(fileObj);
      setTranslatedHeaders([]);
      fileObj.arrayBuffer().then(async (buffer) => {
        // ヘッダー行のみ読み込む
        const decodedString = iconv.decode(Buffer.from(buffer), "utf-8");
        setOriginHeaders(await csvParse(decodedString, { columns: true })); // [{ key_1: 'value 1', key_2: 'value 2' }]
      });
    }
  };

  const translate = useMemo(() => {
    return (item: string, index: number, repl: boolean = false) => {
      let warnMessage =
        item.length > requestMaxLength
          ? `max length ${requestMaxLength}`
          : undefined;
      request.text = item.slice(0, requestMaxLength - 1);
      axios
        .post(urls.translate, request)
        .then((res) => {
          let data = JSON.parse(JSON.stringify(res.data[0]));
          console.log(`${index} ${data.text} -> ${data.translated_text}`);
          // 後処理
          let post_translated_text = translate_postproc(data.translated_text);
          if (repl) {
            const replaceHeader = (
              headers: TranslatedText[],
              index: number
            ) => {
              headers[index].translated_text = post_translated_text;
              headers[index].error = warnMessage;
              return headers;
            };
            setTranslatedHeaders((prevBuffer) => [
              ...replaceHeader(prevBuffer, index),
            ]);
          } else {
            setTranslatedHeaders((prevBuffer) =>
              [
                ...prevBuffer,
                {
                  index: index,
                  origin: item,
                  translated_text: post_translated_text,
                  error: warnMessage,
                  dtype: "string",
                },
              ].sort((a, b) => a.index - b.index)
            );
          }
        })
        .catch((e) => {
          console.error(e);
          if (repl) {
            const setHeaderError = (
              headers: TranslatedText[],
              index: number
            ) => {
              headers[index].error = e.message;
              return headers;
            };
            setTranslatedHeaders((prevBuffer) => [
              ...setHeaderError(prevBuffer, index),
            ]);
          } else {
            setTranslatedHeaders((prevBuffer) =>
              [
                ...prevBuffer,
                {
                  index: index,
                  origin: item,
                  translated_text: "",
                  error: e.message,
                  dtype: "string",
                },
              ].sort((a, b) => a.index - b.index)
            );
          }
        });
    };
  }, [request, requestMaxLength, urls.translate]);

  const outputEventUpdate = useMemo(() => {
    return (originHeaders: string[]) => {
      Promise.all(
        Object.keys(originHeaders[0])
          .map((item, index) => {
            return { origin: item, index: index };
          })
          .filter((x) => x.origin.trim().length > 0)
          .map((x) => translate(x.origin, x.index))
      );
    };
  }, [translate]);

  useEffect(() => {
    if (
      originHeaders.length > 0 &&
      originHeaders.length > translatedHeaders.length
    ) {
      outputEventUpdate(originHeaders);
      setOriginHeaders([]);
    }
  }, [outputEventUpdate, originHeaders, translatedHeaders.length]);

  const handleReconvert = () => {
    Promise.all(
      translatedHeaders
        .filter((x) => !x.translated_text?.trim())
        .map((x) => translate(x.origin, x.index, true))
    );
  };

  const onChangeFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    let input = event.target;
    let files: FileList | null = input.files;

    handleReadFile(files ? files[0] : undefined);
  };
  const createFormData = () => {
    const json = JSON.stringify({
      filename: file?.name,
      header: translatedHeaders,
      table_name: tableName,
    });
    const blob = new Blob([json], {
      type: "application/json",
    });
    let params = new FormData();
    if (file) params.append("uploaded_file", file);
    params.append("header_info", blob);
    return params;
  };

  const handleCreateTable = async (
    event: React.ChangeEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setCreateTableStatus("");
    await axios({
      method: "post",
      url: urls.createTable,
      data: createFormData(),
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then((res) => {
        let data = JSON.parse(JSON.stringify(res.data));
        console.log(data);
        if (!data?.error_reason) {
          setCreateTableStatus(
            `success! 作成したテーブルは${data?.datasetId}:${data?.tableId}`
          );
          setCreateTableFields(JSON.stringify(data?.fields, null, 2));
        } else {
          setCreateTableStatus(`fail! ${data?.error_reason}`);
        }
      })
      .catch((e) => {
        console.log(e);
        setCreateTableStatus(`fail! ${e}`);
      });
  };

  const onChangeCell =
    (index: number, key: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const _cells = [...translatedHeaders];
      _cells[index] = { ..._cells[index], [key]: event.target.value };
      setTranslatedHeaders(_cells);
    };
  const onChangeOption =
    (index: number, key: string) => (event: ChangeEvent<HTMLSelectElement>) => {
      const _cells = [...translatedHeaders];
      _cells[index] = { ..._cells[index], [key]: event.target.value };
      setTranslatedHeaders(_cells);
    };
  const onChangeTableName = (event: ChangeEvent<HTMLInputElement>) => {
    let input = event.target;
    setTableName(input.value);
  };

  const generateRows = translatedHeaders.map((item, index) => {
    return (
      <tr key={item.index}>
        <td>{item.index}</td>
        <td>
          {item.origin}
          <div className="error">{item.error}</div>
        </td>
        <td>
          <input
            className="translated_text"
            onChange={onChangeCell(index, "translated_text")}
            value={item.translated_text}
          />
        </td>
        <td>
          <select value={item.dtype} onChange={onChangeOption(index, "dtype")}>
            <option value="string">string</option>
            <option value="integer">integer</option>
            <option value="float">float</option>
            <option value="boolean">boolean</option>
            <option value="datetime">datetime</option>
            <option value="date">date</option>
            <option value="timestamp">timestamp</option>
            <option value="record">record</option>
          </select>
        </td>
      </tr>
    );
  });

  const handleDownloadJsonSchema = () =>
    new Promise((resolve, reject) => {
      resolve(createTableFields);
    });
  const downloadFilename = () => {
    return file?.name.split(".").shift() + "-schema.json";
  };

  return (
    <div style={{ padding: "20px" }}>
      <p style={{ paddingBottom: "20px" }}>
        csvファイルの日本語カラム名を
        <a href={codicUrl} target="_blank" rel="noreferrer">
          codic
        </a>
        を使って自動的に英字に変換し、BigQueryにデータをインポートする。
      </p>
      <button onClick={() => handleTriggerReadFile()}>ファイル選択</button>
      {!!file?.name && <span>ファイル名：{file?.name}</span>}
      <form style={{ display: "none" }}>
        <input
          type="file"
          accept="text/csv"
          ref={fileInput}
          onChange={onChangeFileUpload}
        />
      </form>
      <div className="translate">
        <div>
          {translatedHeaders.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>index</th>
                  <th>元カラム名</th>
                  <th>変換後</th>
                  <th>データ型</th>
                </tr>
              </thead>
              <tbody>{generateRows}</tbody>
            </table>
          )}
        </div>
        <div>
          {translatedHeaders.length > 0 && (
            <button onClick={() => handleReconvert()}>エラー時の再変換</button>
          )}
        </div>
      </div>
      <hr />
      <p>BigQueryへデータインポート</p>
      <div className="createTable">
        <form onSubmit={handleCreateTable}>
          <div>
            テーブル名:{" "}
            <input
              className="table_name"
              onChange={onChangeTableName}
              value={tableName}
            />
          </div>
          <div>
            <button type="submit">作成とデータインポート</button>
          </div>
        </form>
        <div>{createTableStatus}</div>
        <p></p>
        {createTableFields.length > 0 && (
          <div>
            <button {...getToggleProps()}>
              json schema {isExpanded ? "折りたたむ" : ""}
            </button>
            <section {...getCollapseProps()}>
              <pre>
                <code>{createTableFields}</code>
              </pre>
            </section>
            <DownloadLink
              label="Download"
              filename={downloadFilename()}
              exportFile={() => Promise.resolve(handleDownloadJsonSchema())}
            />
          </div>
        )}
      </div>
    </div>
  );
};
export default ColumnNameConverter;
