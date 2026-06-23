import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { propriedadeService, analiseService } from "../services/api";
import {
  Card,
  Modal,
  FormField,
  Loading,
  EmptyState,
  SectionHeader,
  Alerta,
} from "../components/UI";
import { toast } from "react-toastify";

const IDEAIS = {
  ph: { min: 5.5, max: 6.5, label: "pH", unit: "" },
  saturacao_bases: { min: 60, max: 100, label: "V% (Sat. Bases)", unit: "%" },
  fosforo: { min: 15, max: 999, label: "Fósforo (P)", unit: "mg/dm³" },
  potassio: { min: 0.3, max: 999, label: "Potássio (K)", unit: "cmolc/dm³" },
  calcio: { min: 2.0, max: 999, label: "Cálcio (Ca)", unit: "cmolc/dm³" },
  magnesio: { min: 0.8, max: 999, label: "Magnésio (Mg)", unit: "cmolc/dm³" },
  materia_organica: {
    min: 2.5,
    max: 999,
    label: "Mat. Orgânica",
    unit: "g/dm³",
  },
  ctc: { min: 5, max: 999, label: "CTC", unit: "cmolc/dm³" },
};

function statusParam(key, val) {
  if (!val) return "cinza";
  const i = IDEAIS[key];
  if (!i) return "cinza";
  if (parseFloat(val) < i.min)
    return parseFloat(val) < i.min * 0.8 ? "vermelho" : "amarelo";
  return "verde";
}

export default function Solo() {
  const [searchParams] = useSearchParams();
  const [propriedades, setPropriedades] = useState([]);
  const [talhoes, setTalhoes] = useState([]);
  const [propSel, setPropSel] = useState("");
  const [talhaoSel, setTalhaoSel] = useState(searchParams.get("talhao") || "");
  const [analises, setAnalises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [calagem, setCalagem] = useState(null);
  const [prnt, setPrnt] = useState(80);
  const [salvando, setSalvando] = useState(false);
  const [analiseId, setAnaliseId] = useState("");
  const [form, setForm] = useState({
    talhao_id: "",
    safra: "2024/2025",
    data_coleta: "",
    laboratorio: "",
    ph: "",
    saturacao_bases: "",
    fosforo: "",
    potassio: "",
    calcio: "",
    magnesio: "",
    materia_organica: "",
    ctc: "",
    aluminio: "",
    observacoes: "",
  });

  useEffect(() => {
    propriedadeService.listar().then((r) => {
      setPropriedades(r.data);
      if (!propSel && r.data.length > 0) setPropSel(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!propSel) return;
    propriedadeService.talhoes(propSel).then((r) => {
      setTalhoes(r.data);
      if (!talhaoSel && r.data.length > 0) setTalhaoSel(r.data[0].id);
    });
  }, [propSel]);

  useEffect(() => {
    if (!talhaoSel) return;
    setLoading(true);
    analiseService
      .listar(talhaoSel)
      .then((r) => {
        setAnalises(r.data);
        if (r.data.length > 0) setAnaliseId(r.data[0].id);
      })
      .finally(() => setLoading(false));
    setCalagem(null);
  }, [talhaoSel]);

  const calcular = async () => {
    if (!analiseId) return;
    try {
      const r = await analiseService.calcularCalagem({
        analise_id: analiseId,
        prnt,
      });
      setCalagem(r.data);
    } catch (e) {
      toast.error("Erro ao calcular calagem.");
    }
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await analiseService.criar({ ...form, talhao_id: talhaoSel });
      toast.success("Análise de solo registrada!");
      setModal(false);
      analiseService.listar(talhaoSel).then((r) => {
        setAnalises(r.data);
        if (r.data.length > 0) setAnaliseId(r.data[0].id);
      });
    } catch (e) {
      toast.error(e.response?.data?.erro || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id) => {
    if (!window.confirm("Remover esta análise?")) return;
    try {
      await analiseService.excluir(id);
      toast.success("Análise removida.");
      analiseService.listar(talhaoSel).then((r) => setAnalises(r.data));
      if (analiseId === id) {
        setAnaliseId("");
        setCalagem(null);
      }
    } catch (e) {
      toast.error("Erro ao remover.");
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const analiseAtual = analises.find((a) => a.id === analiseId) || analises[0];
  const talhaoAtual = talhoes.find((t) => t.id === talhaoSel);

  return (
    <div className="page">
      <SectionHeader
        titulo="🧪 Análise de Solo"
        subtitulo="Registre laudos laboratoriais e calcule a necessidade de calagem"
        acao={
          talhaoSel && (
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              + Registrar análise
            </button>
          )
        }
      />

      {/* Seletores */}
      <div className="card mb-20">
        <div
          className="card-body"
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label
              style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap" }}
            >
              🏡 Propriedade:
            </label>
            <select
              className="form-select"
              style={{ width: 220 }}
              value={propSel}
              onChange={(e) => {
                setPropSel(e.target.value);
                setTalhaoSel("");
              }}
            >
              {propriedades.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label
              style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap" }}
            >
              🗺️ Talhão:
            </label>
            <select
              className="form-select"
              style={{ width: 200 }}
              value={talhaoSel}
              onChange={(e) => setTalhaoSel(e.target.value)}
            >
              {talhoes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          {talhaoAtual && (
            <span className="badge badge-verde">
              📐 {parseFloat(talhaoAtual.area_ha || 0).toLocaleString("pt-BR")}{" "}
              ha · {talhaoAtual.cultura_atual}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : !talhaoSel ? (
        <Card>
          <EmptyState
            icone="🧪"
            titulo="Selecione um talhão"
            descricao="Escolha a propriedade e o talhão para ver as análises."
          />
        </Card>
      ) : analises.length === 0 ? (
        <Card>
          <EmptyState
            icone="🧪"
            titulo="Nenhuma análise registrada"
            descricao="Registre o laudo da análise química do solo deste talhão."
            acao={
              <button
                className="btn btn-primary"
                onClick={() => setModal(true)}
              >
                + Registrar primeira análise
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid-2">
          {/* Painel esquerdo: parâmetros */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <h3>📋 Laudo de análise — {talhaoAtual?.nome}</h3>
                {analises.length > 1 && (
                  <select
                    className="form-select"
                    style={{ width: 160, fontSize: 12 }}
                    value={analiseId}
                    onChange={(e) => {
                      setAnaliseId(e.target.value);
                      setCalagem(null);
                    }}
                  >
                    {analises.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.data_coleta?.slice(0, 10)} — {a.safra}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="card-body">
                {analiseAtual && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="badge badge-cinza">
                        📅 {analiseAtual.data_coleta?.slice(0, 10)}
                      </span>
                      <span className="badge badge-cinza">
                        🌾 Safra {analiseAtual.safra}
                      </span>
                      {analiseAtual.laboratorio && (
                        <span className="badge badge-cinza">
                          🔬 {analiseAtual.laboratorio}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {Object.entries(IDEAIS).map(([key, info]) => {
                        const val = analiseAtual[key];
                        const status = statusParam(key, val);
                        const corMap = {
                          verde: "var(--verde)",
                          amarelo: "var(--amarelo)",
                          vermelho: "var(--vermelho)",
                          cinza: "var(--cinza)",
                        };
                        const bgMap = {
                          verde: "var(--verde-claro)",
                          amarelo: "var(--amarelo-claro)",
                          vermelho: "var(--vermelho-claro)",
                          cinza: "var(--cinza-claro)",
                        };
                        return (
                          <div
                            key={key}
                            style={{
                              background: bgMap[status],
                              borderRadius: 8,
                              padding: "10px 12px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--texto-sub)",
                                marginBottom: 2,
                              }}
                            >
                              {info.label}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: 17,
                                  color: corMap[status],
                                }}
                              >
                                {val != null
                                  ? `${parseFloat(val).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}${info.unit}`
                                  : "—"}
                              </span>
                              <span
                                style={{ fontSize: 10, color: corMap[status] }}
                              >
                                {status === "verde"
                                  ? "✓"
                                  : status === "amarelo"
                                    ? "⚠"
                                    : status === "vermelho"
                                      ? "✗"
                                      : "?"}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--texto-sub)",
                              }}
                            >
                              Ideal: ≥{info.min}
                              {info.unit}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: 14 }}
                      onClick={() => excluir(analiseAtual.id)}
                    >
                      🗑 Remover esta análise
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Histórico */}
            {analises.length > 1 && (
              <div className="card">
                <div className="card-header">
                  <h3>📅 Histórico de análises</h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Safra</th>
                        <th>pH</th>
                        <th>V%</th>
                        <th>CTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analises.map((a) => (
                        <tr
                          key={a.id}
                          style={{
                            cursor: "pointer",
                            background:
                              a.id === analiseId ? "var(--verde-claro)" : "",
                          }}
                          onClick={() => {
                            setAnaliseId(a.id);
                            setCalagem(null);
                          }}
                        >
                          <td>{a.data_coleta?.slice(0, 10)}</td>
                          <td>{a.safra}</td>
                          <td>{a.ph}</td>
                          <td>{a.saturacao_bases}%</td>
                          <td>{a.ctc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Painel direito: calagem */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              className="card"
              style={{ borderLeft: `4px solid var(--amarelo)` }}
            >
              <div className="card-header">
                <h3>⚗️ Cálculo de Calagem</h3>
              </div>
              <div className="card-body">
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--texto-sub)",
                    marginBottom: 14,
                  }}
                >
                  Fórmula de saturação por bases (Manual EMBRAPA):
                </p>
                <div
                  style={{
                    background: "var(--cinza-claro)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    marginBottom: 16,
                    fontFamily: "monospace",
                    fontSize: 14,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  NC = (V₂ - V₁) × CTC / PRNT
                  {/* VOU FAZER UMA LEGENDA PARA A FÓRMULA */}
                  <div style={{fontSize: 10,color: "var(--texto-sub)"}}>
                    Onde: NC = necessidade de calcário (t/ha) · V₂ = saturação de bases desejada (%) · V₁ = saturação de bases atual (%) · CTC = capacidade de troca catiônica (cmolc/dm³) · PRNT = poder relativo de neutralização total (%)
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: 14 }}>
                  <FormField label="PRNT do calcário (%)">
                    <input
                      className="form-input"
                      type="number"
                      min={60}
                      max={100}
                      value={prnt}
                      onChange={(e) => {
                        setPrnt(parseInt(e.target.value));
                        setCalagem(null);
                      }}
                    />
                  </FormField>
                  {analises.length > 1 && (
                    <FormField label="Análise de referência">
                      <select
                        className="form-select"
                        value={analiseId}
                        onChange={(e) => {
                          setAnaliseId(e.target.value);
                          setCalagem(null);
                        }}
                      >
                        {analises.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.data_coleta?.slice(0, 10)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={calcular}
                  disabled={!analiseId}
                >
                  ⚗️ Calcular necessidade de calagem
                </button>

                {calagem && (
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        background:
                          calagem.necessidade_calcario === 0
                            ? "var(--verde-claro)"
                            : "var(--amarelo-claro)",
                        borderRadius: 10,
                        padding: "16px",
                        textAlign: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color:
                            calagem.necessidade_calcario === 0
                              ? "var(--verde-texto)"
                              : "var(--amarelo)",
                          marginBottom: 4,
                        }}
                      >
                        Necessidade de Calcário (NC)
                      </div>
                      <div
                        style={{
                          fontSize: 36,
                          fontWeight: 700,
                          color:
                            calagem.necessidade_calcario === 0
                              ? "var(--verde)"
                              : "var(--amarelo)",
                        }}
                      >
                        {calagem.necessidade_calcario}{" "}
                        <span style={{ fontSize: 16 }}>t/ha</span>
                      </div>
                      {calagem.necessidade_calcario > 0 &&
                        talhaoAtual?.area_ha && (
                          <div
                            style={{
                              fontSize: 13,
                              marginTop: 6,
                              color: "var(--amarelo)",
                            }}
                          >
                            Total para{" "}
                            {parseFloat(talhaoAtual.area_ha).toLocaleString(
                              "pt-BR",
                            )}{" "}
                            ha:{" "}
                            <strong>
                              {(
                                calagem.necessidade_calcario *
                                parseFloat(talhaoAtual.area_ha)
                              ).toFixed(2)}{" "}
                              toneladas
                            </strong>
                          </div>
                        )}
                      {calagem.necessidade_calcario === 0 && (
                        <div
                          style={{
                            fontSize: 13,
                            marginTop: 6,
                            color: "var(--verde)",
                          }}
                        >
                          ✅ Solo com saturação de bases adequada!
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        background: "var(--cinza-claro)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "var(--texto-sub)",
                      }}
                    >
                      <div>
                        <strong>Detalhes do cálculo:</strong>
                      </div>
                      <div>
                        V₂ desejado ({calagem.cultura}):{" "}
                        <strong>{calagem.V2}%</strong>
                      </div>
                      <div>
                        V₁ atual: <strong>{calagem.V1}%</strong>
                      </div>
                      <div>
                        CTC: <strong>{calagem.CTC} cmolc/dm³</strong>
                      </div>
                      <div>
                        PRNT: <strong>{calagem.PRNT}%</strong>
                      </div>
                      <div>
                        Status:{" "}
                        <span
                          className={`badge badge-${calagem.status === "adequado" ? "verde" : calagem.status === "critico" ? "vermelho" : "amarelo"}`}
                        >
                          {calagem.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dicas técnicas */}
            <div className="card">
              <div className="card-header">
                <h3>📚 Referências técnicas</h3>
              </div>
              <div className="card-body" style={{ fontSize: 12 }}>
                {[
                  ["Soja", "65%", "5.8–6.2"],
                  ["Milho", "70%", "5.8–6.5"],
                  ["Trigo", "65%", "5.8–6.2"],
                  ["Café", "60%", "5.5–6.0"],
                ].map(([c, v, ph]) => (
                  <div
                    key={c}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--borda)",
                      color: "var(--texto-sub)",
                    }}
                  >
                    <span>
                      {c === "Soja"
                        ? "🫘"
                        : c === "Milho"
                          ? "🌽"
                          : c === "Trigo"
                            ? "🌾"
                            : "☕"}{" "}
                      {c}
                    </span>
                    <span>
                      V% ideal: <strong>{v}</strong> · pH: <strong>{ph}</strong>
                    </span>
                  </div>
                ))}
                <p style={{ marginTop: 10, color: "var(--texto-sub)" }}>
                  Fonte: Manual EMBRAPA / IAPAR-PR
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal
          titulo="📋 Registrar análise de solo"
          onFechar={() => setModal(false)}
          largura={600}
        >
          <form onSubmit={salvar}>
            <div className="modal-body">
              <div className="form-grid-2">
                <FormField label="Safra" required>
                  <select
                    className="form-select"
                    value={form.safra}
                    onChange={set("safra")}
                  >
                    {["2024/2025", "2023/2024", "2022/2023", "2021/2022"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </FormField>
                <FormField label="Data da coleta" required>
                  <input
                    className="form-input"
                    type="date"
                    value={form.data_coleta}
                    onChange={set("data_coleta")}
                    required
                  />
                </FormField>
              </div>
              <FormField label="Laboratório">
                <input
                  className="form-input"
                  value={form.laboratorio}
                  onChange={set("laboratorio")}
                  placeholder="Ex: Laborsolo Londrina"
                />
              </FormField>
              <div
                style={{
                  background: "var(--cinza-claro)",
                  borderRadius: 8,
                  padding: "14px",
                  marginBottom: 4,
                }}
              >
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                  🧪 Parâmetros macronutrientes
                </p>
                <div className="form-grid-4">
                  <FormField label="pH">
                    <input
                      className="form-input"
                      type="number"
                      step="0.1"
                      min="3"
                      max="9"
                      value={form.ph}
                      onChange={set("ph")}
                      placeholder="5.8"
                    />
                  </FormField>
                  <FormField label="V% (Sat. Bases)">
                    <input
                      className="form-input"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.saturacao_bases}
                      onChange={set("saturacao_bases")}
                      placeholder="52"
                    />
                  </FormField>
                  <FormField label="CTC (cmolc/dm³)">
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      value={form.ctc}
                      onChange={set("ctc")}
                      placeholder="8.5"
                    />
                  </FormField>
                  <FormField label="Al³⁺ (cmolc/dm³)">
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      value={form.aluminio}
                      onChange={set("aluminio")}
                      placeholder="0.0"
                    />
                  </FormField>
                </div>
                <div className="form-grid-4">
                  <FormField label="P (mg/dm³)">
                    <input
                      className="form-input"
                      type="number"
                      step="0.1"
                      value={form.fosforo}
                      onChange={set("fosforo")}
                      placeholder="18"
                    />
                  </FormField>
                  <FormField label="K (cmolc/dm³)">
                    <input
                      className="form-input"
                      type="number"
                      step="0.001"
                      value={form.potassio}
                      onChange={set("potassio")}
                      placeholder="0.35"
                    />
                  </FormField>
                  <FormField label="Ca (cmolc/dm³)">
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      value={form.calcio}
                      onChange={set("calcio")}
                      placeholder="3.2"
                    />
                  </FormField>
                  <FormField label="Mg (cmolc/dm³)">
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      value={form.magnesio}
                      onChange={set("magnesio")}
                      placeholder="1.1"
                    />
                  </FormField>
                </div>
                <div className="form-grid-2">
                  <FormField label="MO (g/dm³)">
                    <input
                      className="form-input"
                      type="number"
                      step="0.1"
                      value={form.materia_organica}
                      onChange={set("materia_organica")}
                      placeholder="3.2"
                    />
                  </FormField>
                </div>
              </div>
              <FormField label="Observações">
                <textarea
                  className="form-textarea"
                  value={form.observacoes}
                  onChange={set("observacoes")}
                  placeholder="Informações adicionais do laudo..."
                />
              </FormField>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModal(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={salvando}
              >
                {salvando ? "⏳..." : "✅ Registrar análise"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
