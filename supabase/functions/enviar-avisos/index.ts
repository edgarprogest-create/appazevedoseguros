// EXA Seguros — Edge Function "enviar-avisos"
// Envia notificações (Web Push) com a app fechada: renovações, pagamentos,
// check-up de saúde e dicas da época, segundo as preferências de cada cliente.
// Chamada todos os dias pelo pg_cron (ver supabase/10-passo-notificacoes-push.sql).
//
// Não precisa de segredos configurados à mão: usa SUPABASE_DB_URL (já existe em
// todas as Edge Functions) e cria as chaves de envio (VAPID) na primeira chamada.

import webpush from "npm:web-push@3.6.7";
import postgres from "npm:postgres@3.4.5";

const CONTACTO = "mailto:edgar.azevedo@private.ageas.pt";
const MESES_FRAC: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
const N_FRAC: Record<string, number> = { mensal: 12, trimestral: 4, semestral: 2, anual: 1 };
const ESTACOES = [
  { id: "gripe", meses: [9, 10, 11, 0, 1], t: "Está com gripe ou constipação?", m: "É a época de gripe. Se tiver febre, tosse ou dores no corpo, marque a sua consulta num hospital ou clínica da rede Médis perto de si. Com o seu seguro paga menos." },
  { id: "alergias", meses: [2, 3, 4], t: "Alergias da primavera?", m: "Espirros, olhos irritados ou nariz entupido? Consulte um especialista em imunoalergologia da rede Médis perto de si." },
  { id: "verao", meses: [5, 6, 7], t: "Proteja a pele este verão", m: "Antes das férias, faça o rastreio de sinais com um dermatologista da rede Médis. Em caso de insolação, procure o hospital Médis mais próximo." },
  { id: "regresso", meses: [8], t: "Regresso às aulas, regresso à rotina", m: "É uma boa altura para a consulta de pediatria e oftalmologia dos mais novos na rede Médis." },
];

type Aviso = { chave: string; titulo: string; corpo: string; tag: string };
type Apolice = Record<string, unknown>;

// ---------- datas (sempre em dias de calendário, hora de Lisboa) ----------
function hojeLisboa(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function dia(iso: string): number { // dias desde 1970-01-01
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
function isoDe(n: number): string { return new Date(n * 86400000).toISOString().slice(0, 10); }
function maisMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, ultimo));
  return dt.toISOString().slice(0, 10);
}
function pt(iso: string): string { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }
function euros(n: number): string { return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€"; }
function txt(v: unknown): string { return v == null ? "" : String(v); }
function dataOk(v: unknown): string | null { const s = txt(v); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null; }

// ---------- avisos de um cliente (mesmas regras da app) ----------
function avisosDoCliente(apolices: Apolice[], prefs: Record<string, unknown>, hoje: string): Aviso[] {
  const on = (k: string) => prefs?.[k] !== false;
  const h = dia(hoje);
  const ativas = apolices.filter((a) => !/cancel|anula/i.test(txt(a.situacao)));
  const out: Aviso[] = [];

  for (const a of ativas) {
    const num = txt(a.numero_apolice) || txt(a.id);
    const nome = txt(a.produto) || txt(a.sub_ramo) || txt(a.ramo) || "Seguro";
    const venc = dataOk(a.data_vencimento);
    const inicio = dataOk(a.data_inicio);

    // Renovação: 60, 30, 7 e 1 dia(s) antes
    if (on("renovacao") && venc) {
      const dias = dia(venc) - h;
      if (dias >= 0 && dias <= 60) {
        const marco = dias <= 1 ? 1 : dias <= 7 ? 7 : dias <= 30 ? 30 : 60;
        out.push({
          chave: `renov|${num}|${venc}|${marco}`, tag: `renov-${num}`,
          titulo: `Renovação: ${nome}`,
          corpo: `A sua apólice renova a ${pt(venc)} (${dias === 0 ? "hoje" : dias === 1 ? "amanhã" : "dentro de " + dias + " dias"}). Caso necessite de ajustar, alterar ou verificar as condições, contacte o seu gestor de seguros.`,
        });
      }
    }

    // Pagamento: 3 dias antes de cada débito
    const frac = txt(a.fracionamento).toLowerCase() || "anual";
    const meses = MESES_FRAC[frac];
    const ancora = inicio || venc;
    if (on("pagamentos") && meses && ancora) {
      let debito = ancora, k = 0;
      while (dia(debito) < h && k < 1200) { k++; debito = maisMeses(ancora, k * meses); }
      const dias = dia(debito) - h;
      if (dias >= 0 && dias <= 3) {
        const premio = Number(a.premio_comercial);
        const valor = isFinite(premio) && premio > 0 ? euros(premio / (N_FRAC[frac] || 1)) : "";
        out.push({
          chave: `pay|${num}|${debito}`, tag: `pay-${num}`,
          titulo: `Pagamento ${dias === 0 ? "hoje" : "em " + dias + (dias === 1 ? " dia" : " dias")}: ${nome}`,
          corpo: `${valor ? "Débito de " + valor + " a " : "Débito a "}${pt(debito)}. Confirme que tem saldo na conta.`,
        });
      }
    }

    // Check-up de saúde: a cada 6 meses desde o início da apólice
    if (on("checkup") && /sa[uú]de/i.test(txt(a.ramo)) && inicio) {
      const n = Math.floor((h - dia(inicio)) / 182);
      if (n >= 1) {
        const devido = dia(inicio) + n * 182;
        if (h - devido <= 6) {
          out.push({
            chave: `checkup|${num}|${isoDe(devido)}`, tag: `checkup-${num}`,
            titulo: "Está na altura do seu check-up",
            corpo: "Passaram 6 meses. Marque uma consulta com o seu médico para confirmar que está tudo bem.",
          });
        }
      }
    }
  }

  // Dica de saúde da época: uma vez por estação, para quem tem seguro de saúde
  if (on("sazonal") && ativas.some((a) => /sa[uú]de/i.test(txt(a.ramo)))) {
    const mes = Number(hoje.slice(5, 7)) - 1, ano = Number(hoje.slice(0, 4));
    const e = ESTACOES.find((x) => x.meses.includes(mes));
    if (e) {
      const anoEstacao = e.id === "gripe" && mes < 2 ? ano - 1 : ano;
      out.push({ chave: `season|${e.id}|${anoEstacao}`, tag: `season-${e.id}`, titulo: e.t, corpo: e.m });
    }
  }
  return out;
}

// ---------- envio ----------
async function enviar(sub: { endpoint: string; p256dh: string; auth: string }, aviso: { titulo: string; corpo: string; tag: string; url?: string }, vapid: { pub: string; priv: string }) {
  const det = webpush.generateRequestDetails(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify({ title: aviso.titulo, body: aviso.corpo, tag: aviso.tag, url: aviso.url || "./" }),
    { TTL: 86400, urgency: "normal", vapidDetails: { subject: CONTACTO, publicKey: vapid.pub, privateKey: vapid.priv } },
  );
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(det.headers)) if (k.toLowerCase() !== "content-length") headers[k] = String(v);
  const r = await fetch(det.endpoint, { method: det.method, headers, body: det.body });
  await r.body?.cancel();
  return r.status;
}

async function hash(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(b.slice(0, 8), (x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
  try {
    const cfgRows = await sql`select chave, valor from public.push_config`;
    const cfg: Record<string, string> = Object.fromEntries(cfgRows.map((r) => [r.chave, r.valor]));
    if (!cfg.cron_secret || req.headers.get("x-cron-secret") !== cfg.cron_secret) {
      return new Response(JSON.stringify({ ok: false, erro: "sem_permissao" }), { status: 401 });
    }

    // Chaves de envio: criadas na primeira chamada
    if (!cfg.vapid_public || !cfg.vapid_private) {
      const k = webpush.generateVAPIDKeys();
      await sql`insert into public.push_config (chave, valor) values ('vapid_public', ${k.publicKey}), ('vapid_private', ${k.privateKey}) on conflict (chave) do nothing`;
      const again = await sql`select chave, valor from public.push_config where chave in ('vapid_public','vapid_private')`;
      for (const r of again) cfg[r.chave] = r.valor;
    }
    const vapid = { pub: cfg.vapid_public, priv: cfg.vapid_private };
    const corpo = await req.json().catch(() => ({}));

    if (corpo.acao === "iniciar") {
      return Response.json({ ok: true, chave_publica: vapid.pub });
    }

    // Visitante acabou de aceitar notificações: boas-vindas (mensagem do dia 0)
    if (corpo.acao === "bem_vindo") {
      const ep = txt(corpo.endpoint);
      const [sub] = await sql`select endpoint, p256dh, auth from public.push_subscricoes where endpoint = ${ep} and auth_id is null`;
      const [msg] = await sql`select id, titulo, corpo, url from public.push_mensagens_visitantes where ativo and dia = 0 order by id limit 1`;
      if (!sub || !msg) return Response.json({ ok: true, enviados: 0 });
      const chave = `visit|${msg.id}|${await hash(sub.endpoint)}`;
      const ja = await sql`select 1 from public.push_enviados where chave = ${chave}`;
      if (ja.length) return Response.json({ ok: true, enviados: 0, repetido: true });
      const st = await enviar(sub as never, { titulo: msg.titulo, corpo: msg.corpo, tag: `visit-${msg.id}`, url: msg.url }, vapid);
      if (st >= 200 && st < 300) await sql`insert into public.push_enviados (chave) values (${chave}) on conflict do nothing`;
      else if (st === 404 || st === 410) await sql`delete from public.push_subscricoes where endpoint = ${sub.endpoint}`;
      return Response.json({ ok: true, enviados: st >= 200 && st < 300 ? 1 : 0, estado: st });
    }

    const subs = await sql`
      select s.endpoint, s.p256dh, s.auth, s.prefs, c.nif
      from public.push_subscricoes s join public.clientes c on c.auth_id = s.auth_id`;

    // Teste: { "acao": "teste", "nif": "123456789" }
    if (corpo.acao === "teste") {
      const nif = txt(corpo.nif).replace(/\D/g, "");
      let enviados = 0, falhados = 0;
      for (const s of subs.filter((x) => x.nif === nif)) {
        const st = await enviar(s as never, { titulo: "Teste EXA Seguros", corpo: "As notificações estão a funcionar neste telemóvel.", tag: "teste" }, vapid);
        if (st >= 200 && st < 300) enviados++; else falhados++;
      }
      return Response.json({ ok: true, telemoveis: enviados + falhados, enviados, falhados });
    }

    const hoje = typeof corpo.hoje === "string" && /^\d{4}-\d{2}-\d{2}$/.test(corpo.hoje) ? corpo.hoje : hojeLisboa();
    const nifs = [...new Set(subs.map((s) => s.nif as string))];
    const apolices = nifs.length ? await sql`select a.nif_cliente, to_jsonb(a.*) as a from public.apolices a where a.nif_cliente = any(${nifs})` : [];
    const porNif = new Map<string, Apolice[]>();
    for (const r of apolices) {
      const lista = porNif.get(r.nif_cliente) || [];
      lista.push(r.a as Apolice);
      porNif.set(r.nif_cliente, lista);
    }

    const res = { hoje, telemoveis: subs.length, enviados: 0, repetidos: 0, falhados: 0, removidos: 0 };
    for (const s of subs) {
      const avisos = avisosDoCliente(porNif.get(s.nif) || [], (s.prefs || {}) as Record<string, unknown>, hoje);
      if (!avisos.length) continue;
      const h = await hash(s.endpoint);
      for (const av of avisos) {
        const chave = `${av.chave}|${h}`;
        const ja = await sql`select 1 from public.push_enviados where chave = ${chave}`;
        if (ja.length) { res.repetidos++; continue; }
        let st = 0;
        try { st = await enviar(s as never, av, vapid); } catch (_) { st = 0; }
        if (st >= 200 && st < 300) {
          await sql`insert into public.push_enviados (chave) values (${chave}) on conflict do nothing`;
          res.enviados++;
        } else if (st === 404 || st === 410) {
          await sql`delete from public.push_subscricoes where endpoint = ${s.endpoint}`;
          res.removidos++;
          break;
        } else {
          res.falhados++;
        }
      }
    }
    // Visitantes (sem conta): no máximo uma mensagem por dia, segundo os dias desde que aceitaram
    const temVisitantes = await sql`select to_regclass('public.push_mensagens_visitantes') is not null as ok`;
    if (temVisitantes[0]?.ok) {
      const msgs = await sql`select id, dia, titulo, corpo, url from public.push_mensagens_visitantes where ativo order by dia desc, id`;
      const vis = await sql`select endpoint, p256dh, auth, (criado_em at time zone 'Europe/Lisbon')::date::text as desde from public.push_subscricoes where auth_id is null`;
      (res as Record<string, number>).visitantes = vis.length;
      for (const v of vis) {
        const dias = dia(hoje) - dia(v.desde);
        const h = await hash(v.endpoint);
        for (const m of msgs) {
          if (m.dia > dias || m.dia < dias - 2) continue;   // só a mensagem de hoje (ou de 1-2 dias atrás, se falhou)
          const chave = `visit|${m.id}|${h}`;
          const ja = await sql`select 1 from public.push_enviados where chave = ${chave}`;
          if (ja.length) { res.repetidos++; break; }   // a mais recente já foi: não manda mensagens antigas
          let st = 0;
          try { st = await enviar(v as never, { titulo: m.titulo, corpo: m.corpo, tag: `visit-${m.id}`, url: m.url }, vapid); } catch (_) { st = 0; }
          if (st >= 200 && st < 300) { await sql`insert into public.push_enviados (chave) values (${chave}) on conflict do nothing`; res.enviados++; }
          else if (st === 404 || st === 410) { await sql`delete from public.push_subscricoes where endpoint = ${v.endpoint}`; res.removidos++; }
          else res.falhados++;
          break;
        }
      }
    }

    // histórico com mais de 400 dias já não é preciso
    await sql`delete from public.push_enviados where enviado_em < now() - interval '400 days'`;
    return Response.json({ ok: true, ...res });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, erro: String((e as Error)?.message || e) }), { status: 500 });
  } finally {
    await sql.end({ timeout: 5 });
  }
});
