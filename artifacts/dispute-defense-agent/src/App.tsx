import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getApiHealthCheckQueryKey, getGetDisputeQueryKey, useApiHealthCheck, useGetActivity, useGetDashboardSummary, useGetDispute, useGetDisputes, useGetPayPalDisputes, useGetPayPalStatus } from '@workspace/api-client-react';
import type { ActivityEntry, Dispute, PayPalDisputeSummary } from '@workspace/api-client-react';
import { Activity, AlertCircle, ArrowLeft, ArrowRight, Check, ClipboardList, Clock3, CreditCard, FileCheck2, LayoutDashboard, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/disputes', label: 'Disputes', icon: ClipboardList },
  { href: '/paypal-sandbox', label: 'PayPal Sandbox', icon: CreditCard },
  { href: '/evidence', label: 'Evidence', icon: FileCheck2 },
  { href: '/activity', label: 'Activity Log', icon: Activity },
];

function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Date not available';
  return new Intl.DateTimeFormat('en-US', options ?? { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function money(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function paypalMoney(amount: string | null, currency: string | null) {
  if (!amount) return '—';
  const numeric = Number(amount);
  if (Number.isFinite(numeric) && currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return money(numeric, currency);
    } catch {
      return `${amount} ${currency}`;
    }
  }
  return `${amount}${currency ? ` ${currency}` : ''}`;
}

function optionalDateLabel(value: string | null) {
  return value ? dateLabel(value, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not provided';
}

function statusLabel(status: Dispute['status']) {
  return status.replaceAll('_', ' ');
}

function StatusPill({ status }: { status: Dispute['status'] }) {
  return <span className={`status status-${status}`} data-testid={`status-${status}`}>{statusLabel(status)}</span>;
}

function DataState({ loading, error, retry, empty, children }: { loading?: boolean; error?: boolean; retry?: () => void; empty?: boolean; children?: ReactNode }) {
  if (loading) return <div className="panel skeleton" aria-label="Loading demo records" data-testid="state-loading"><div className="skeleton-line" /><div className="skeleton-line short" /><div className="skeleton-line" /></div>;
  if (error) return <div className="panel error-state" role="alert" data-testid="state-error"><AlertCircle size={20} style={{ margin: '0 auto 9px' }} /><div>Demo records could not be reached.</div><button className="retry-button" onClick={retry} data-testid="button-retry">Try again</button></div>;
  if (empty) return <div className="panel empty-state" data-testid="state-empty"><div className="empty-mark"><ClipboardList size={18} /></div><div>No demo records to show yet.</div></div>;
  return <>{children}</>;
}

function CaseRow({ dispute }: { dispute: Dispute }) {
  return (
    <Link href={`/disputes/${encodeURIComponent(dispute.id)}`} className="case-row" role="row" data-testid={`link-dispute-${dispute.id}`}>
      <span className="case-id case-cell" role="cell" data-label="Case ID">{dispute.id}</span>
      <span className="case-amount case-cell" role="cell" data-label="Order Amount">{money(dispute.amount, dispute.currency)}</span>
      <span className="case-reason case-cell" role="cell" data-label="Dispute Reason">{dispute.reason}</span>
      <span className="case-deadline case-cell" role="cell" data-label="Response Deadline">{dateLabel(dispute.responseDeadline, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      <span className="case-status case-cell" role="cell" data-label="Status"><StatusPill status={dispute.status} /></span>
      <span className="case-action case-cell" role="cell" data-label="Recommended Action">
        <span>{dispute.recommendedAction}</span>
        <small>Static demo guidance · not an AI prediction</small>
      </span>
    </Link>
  );
}

function CaseList({ disputes, loading, error, retry, compact = false }: { disputes?: Dispute[]; loading: boolean; error: boolean; retry: () => void; compact?: boolean }) {
  const records = disputes ?? [];
  return (
    <>
      <div className="case-table" role="table" aria-label="Simulated disputes">
        {!compact && <div className="table-head" role="row"><span role="columnheader">Case ID</span><span role="columnheader">Order Amount</span><span role="columnheader">Dispute Reason</span><span role="columnheader">Response Deadline</span><span role="columnheader">Status</span><span role="columnheader">Recommended Action</span></div>}
        <DataState loading={loading} error={error} retry={retry} empty={!loading && !error && records.length === 0}>
          {records.map((item) => <CaseRow key={item.id} dispute={item} />)}
        </DataState>
      </div>
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isSandboxRoute = location === '/paypal-sandbox';
  const health = useApiHealthCheck({ query: { queryKey: getApiHealthCheckQueryKey(), refetchInterval: 60_000 } });
  const label = location === '/' ? 'Overview' : location.startsWith('/disputes/') ? 'Case details' : navItems.find((item) => item.href === location)?.label ?? 'Workspace';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" data-testid="link-brand">
          <div className="brand-mark"><ShieldCheck size={19} /></div>
          <div><div className="brand-name">Dispute Defense</div><div className="brand-sub">Seller workspace</div></div>
        </Link>
        <div className={`demo-flag ${isSandboxRoute ? 'sandbox-flag' : ''}`}><span className="demo-dot" />{isSandboxRoute ? 'PayPal Sandbox · read-only' : 'Demo data · simulated'}</div>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map(({ href, label: itemLabel, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} aria-label={itemLabel} aria-current={location === href ? 'page' : undefined} data-testid={`link-nav-${itemLabel.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={16} strokeWidth={1.8} /><span>{itemLabel}</span>
            </Link>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="connection"><span className={`connection-dot ${health.isSuccess ? 'online' : ''}`} />{health.isLoading ? 'Checking API' : health.isError ? 'API unavailable' : 'Application API available'}</div>
          <p className="side-note">This checks the application API. PayPal Sandbox status is verified separately.</p>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Demo workspace <span style={{ padding: '0 7px', color: '#b0aca2' }}>/</span> {label}</div>
          <div className="top-right"><span className={`top-demo ${isSandboxRoute ? 'top-sandbox' : ''}`}>{isSandboxRoute ? 'PayPal Sandbox · read-only' : 'Demo · simulated records'}</span><div className="owner"><span className="owner-mark">SD</span> Seller desk</div></div>
        </header>
        {children}
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>;
}

function OverviewPage() {
  const summary = useGetDashboardSummary();
  const disputesQuery = useGetDisputes();
  const disputes = disputesQuery.data ?? [];
  const upcoming = [...disputes].filter((item) => item.status !== 'resolved').sort((a, b) => new Date(a.responseDeadline).getTime() - new Date(b.responseDeadline).getTime()).slice(0, 3);
  const summaryData = summary.data;
  return (
    <div className="content">
      <PageIntro eyebrow="Seller operations · simulated" title="Dispute overview" subtitle="A clear view of open cases, upcoming deadlines, and case preparation." action={<Link href="/disputes" className="text-link" data-testid="link-all-disputes">Review disputes <ArrowRight size={14} /></Link>} />
      <div className="notice" role="note"><ShieldCheck size={16} /><div><strong>Demo workspace.</strong> All cases and activity are simulated. Guidance is static, for human review only; nothing here connects to a payment provider or submits a response.</div></div>
      <div className="summary-grid">
        <div className="metric" data-testid="metric-open-disputes"><div className="metric-label">Open Disputes</div><div className="metric-value">{summary.isLoading ? '—' : summaryData?.openDisputes ?? '—'}</div><div className="metric-foot">Cases needing attention</div></div>
        <div className="metric" data-testid="metric-money-at-risk"><div className="metric-label">Money at Risk</div><div className="metric-value">{summary.isLoading ? '—' : summaryData ? money(summaryData.moneyAtRisk) : '—'}</div><div className="metric-foot">Across simulated open cases</div></div>
        <div className="metric" data-testid="metric-upcoming-deadlines"><div className="metric-label">Upcoming Deadlines</div><div className="metric-value">{summary.isLoading ? '—' : summaryData?.upcomingDeadlines ?? '—'}</div><div className="metric-foot">Response dates ahead</div></div>
        <div className="metric" data-testid="metric-cases-resolved"><div className="metric-label">Cases Resolved</div><div className="metric-value">{summary.isLoading ? '—' : summaryData?.casesResolved ?? '—'}</div><div className="metric-foot">Demo history</div></div>
      </div>
      {summary.isError && <div className="notice" role="alert"><AlertCircle size={15} />Summary metrics could not be loaded. <button className="retry-button" style={{ margin: '-5px 0 0 auto' }} onClick={() => summary.refetch()} data-testid="button-retry-summary">Retry summary</button></div>}
      <div className="section-heading"><h2>Cases to review</h2><span>Newest deadlines first</span></div>
      <div className="panel case-list"><CaseList disputes={upcoming} loading={disputesQuery.isLoading} error={disputesQuery.isError} retry={() => disputesQuery.refetch()} compact /></div>
      <div className="dashboard-lower">
        <div>
          <div className="section-heading"><h2>Deadline watch</h2><span>Simulated case dates</span></div>
          <div className="deadline-card">
            <h3>Keep the next date in view.</h3><p>Use the case detail to inspect the deadline and prepare your own review. Dates are illustrative and should be verified independently.</p>
            {upcoming.length ? upcoming.map((item) => <div className="deadline-item" key={item.id}><span><strong>{item.orderId}</strong> · {item.customerName}</span><span>{dateLabel(item.responseDeadline, { month: 'short', day: 'numeric' })}</span></div>) : <div className="deadline-item">No open case deadlines in this demo.</div>}
          </div>
        </div>
        <div>
          <div className="section-heading"><h2>Preparation note</h2></div>
          <div className="panel panel-pad"><div className="notice"><Clock3 size={16} /><div>Review case facts, gather relevant records outside this tool, and follow your provider's official process. This demo does not accept claims, issue refunds, or send evidence.</div></div><Link href="/evidence" className="text-link" style={{ marginTop: 18 }} data-testid="link-evidence-prep">View evidence checklist <ArrowRight size={14} /></Link></div>
        </div>
      </div>
    </div>
  );
}

function DisputesPage() {
  const query = useGetDisputes();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const records = useMemo(() => (query.data ?? []).filter((item) => {
    const textMatch = `${item.customerName} ${item.orderId} ${item.id} ${item.reason}`.toLowerCase().includes(search.toLowerCase());
    return textMatch && (status === 'all' || item.status === status);
  }), [query.data, search, status]);
  return (
    <div className="content">
      <PageIntro eyebrow="Case register · simulated" title="Disputes" subtitle="Review each simulated case, its disputed amount, and its response deadline." />
      <div className="notice"><ShieldCheck size={16} /><div><strong>Simulated records only.</strong> No live provider data, claim actions, or submission workflow is available here.</div></div>
      <div className="toolbar">
        <label className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, order, or reason" aria-label="Search disputes" data-testid="input-search-disputes" /></label>
        {['all', 'needs_response', 'under_review', 'resolved'].map((item) => <button key={item} className={`filter-button ${status === item ? 'active' : ''}`} onClick={() => setStatus(item)} data-testid={`filter-${item}`}>{item === 'all' ? 'All cases' : statusLabel(item as Dispute['status'])}</button>)}
        <span className="list-meta">{query.isLoading ? 'Loading cases' : `${records.length} ${records.length === 1 ? 'case' : 'cases'}`}</span>
      </div>
      <div className="section-heading"><h2>Case list</h2><span>Amounts in the listed currency</span></div>
      <div className="panel case-list">
        <CaseList disputes={records} loading={query.isLoading} error={query.isError} retry={() => query.refetch()} />
      </div>
    </div>
  );
}

function PayPalSandboxPage() {
  const statusQuery = useGetPayPalStatus();
  const disputesQuery = useGetPayPalDisputes();
  const result = disputesQuery.data;
  const actualSandboxResult = result?.source === 'paypal_sandbox' && !result.isSimulated;
  const simulatedResult = Boolean(result && !actualSandboxResult);
  const oauthStatus = statusQuery.isLoading
    ? 'Checking OAuth'
    : statusQuery.isError
      ? 'Status unavailable'
      : statusQuery.data?.authenticated
        ? 'Authenticated'
        : 'Not authenticated';

  const refresh = () => {
    void statusQuery.refetch();
    void disputesQuery.refetch();
  };

  return (
    <div className="content">
      <PageIntro
        eyebrow="Read-only provider view"
        title="PayPal Sandbox disputes"
        subtitle="Sandbox results are kept separate from the simulated demo cases in the rest of this workspace."
        action={<button className="sandbox-refresh" onClick={refresh} disabled={statusQuery.isFetching || disputesQuery.isFetching} data-testid="button-refresh-paypal"><RefreshCw size={14} /> Refresh Sandbox data</button>}
      />

      <div className="sandbox-status-grid">
        <section className="panel sandbox-status-card" data-testid="card-paypal-oauth">
          <div className="sandbox-card-label">Sandbox OAuth</div>
          <div className="sandbox-status-line">
            <span className={`sandbox-connection-state ${statusQuery.data?.authenticated ? 'connected' : statusQuery.isError ? 'unavailable' : ''}`} data-testid="status-paypal-oauth">{oauthStatus}</span>
            <span className="sandbox-readonly-label">Read-only</span>
          </div>
          <p>{statusQuery.data?.message ?? (statusQuery.isError ? 'The application could not retrieve PayPal Sandbox authentication status.' : 'Checking the PayPal Sandbox connection using server-side credentials.')}</p>
        </section>
        <section className="panel sandbox-status-card">
          <div className="sandbox-card-label">Safety boundary</div>
          <div className="sandbox-boundary-title"><ShieldCheck size={17} /> No payment actions</div>
          <p>This view only reads dispute data from PayPal Sandbox. It cannot accept disputes, issue refunds, or submit evidence.</p>
        </section>
      </div>

      {disputesQuery.isLoading && <div className="panel sandbox-empty" role="status" data-testid="state-paypal-loading"><div className="skeleton-line" /><div className="skeleton-line short" /><p>Requesting dispute data from the application API.</p></div>}

      {disputesQuery.isError && (
        <div className="panel sandbox-empty sandbox-error" role="alert" data-testid="state-paypal-error">
          <AlertCircle size={20} />
          <strong>Could not retrieve a dispute result.</strong>
          <p>The application API did not return either Sandbox data or its labelled demo fallback. No cases are shown in this state.</p>
          <button className="retry-button" onClick={refresh} data-testid="button-retry-paypal">Try again</button>
        </div>
      )}

      {!disputesQuery.isLoading && !disputesQuery.isError && result && (
        <>
          <div className={`sandbox-source-banner ${actualSandboxResult ? 'source-actual' : 'source-simulated'}`} role="status" data-testid="status-paypal-data-source">
            <span className="sandbox-source-icon">{actualSandboxResult ? <ShieldCheck size={17} /> : <AlertCircle size={17} />}</span>
            <div className="sandbox-source-copy">
              <strong>{actualSandboxResult ? 'Source: PayPal Sandbox API' : 'Source: simulated demo fallback · not PayPal data'}</strong>
              <span>{result.message}{actualSandboxResult ? ' This is Sandbox data, not production account data.' : ' These cases must not be treated as PayPal disputes.'}</span>
              {simulatedResult && result.errorCode && <small>Sandbox error category: {result.errorCode}</small>}
            </div>
            <span className="sandbox-count" data-testid="text-paypal-dispute-count">{result.total} {result.total === 1 ? 'case' : 'cases'}</span>
          </div>

          {result.disputes.length === 0 ? (
            <div className="panel sandbox-empty" data-testid="state-paypal-empty">
              <div className="empty-mark"><CreditCard size={18} /></div>
              <strong>{actualSandboxResult ? 'No PayPal Sandbox disputes found.' : 'No simulated fallback cases are available.'}</strong>
              <p>{actualSandboxResult ? 'The authenticated Sandbox request succeeded and returned an empty dispute list. No demo records have been substituted.' : 'The current result contains no cases. Demo and Sandbox records remain separate.'}</p>
            </div>
          ) : (
            <>
              <div className="section-heading sandbox-list-heading">
                <h2>{actualSandboxResult ? 'Sandbox dispute list' : 'Simulated fallback cases'}</h2>
                <span>{actualSandboxResult ? 'PayPal Sandbox response' : 'Not provider data'}</span>
              </div>
              <div className="panel sandbox-table" role="table" aria-label={actualSandboxResult ? 'PayPal Sandbox disputes' : 'Simulated fallback disputes'} data-testid="table-paypal-disputes">
                <div className="sandbox-table-head" role="row">
                  <span role="columnheader">Case ID</span><span role="columnheader">Amount</span><span role="columnheader">Reason</span><span role="columnheader">PayPal Status</span><span role="columnheader">Response Deadline</span>
                </div>
                {result.disputes.map((dispute, index) => <PayPalDisputeRow key={dispute.id ?? `missing-${index}`} dispute={dispute} index={index} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PayPalDisputeRow({ dispute, index }: { dispute: PayPalDisputeSummary; index: number }) {
  const id = dispute.id ?? 'ID unavailable';
  return (
    <div className={`sandbox-row ${dispute.isSimulated ? 'sandbox-row-simulated' : ''}`} role="row" data-testid={`row-paypal-dispute-${index}`}>
      <span className="sandbox-cell sandbox-case-id" role="cell" data-label="Case ID">{id}</span>
      <span className="sandbox-cell sandbox-case-amount" role="cell" data-label="Amount">{paypalMoney(dispute.amount, dispute.currencyCode)}</span>
      <span className="sandbox-cell" role="cell" data-label="Reason">{dispute.reason ?? 'Not provided'}</span>
      <span className="sandbox-cell" role="cell" data-label="PayPal Status"><span className={`sandbox-status-pill ${dispute.isSimulated ? 'simulated' : ''}`} data-testid={`status-paypal-dispute-${index}`}>{dispute.status?.replaceAll('_', ' ').toLowerCase() ?? 'Not provided'}{dispute.isSimulated ? ' · demo' : ''}</span></span>
      <span className="sandbox-cell" role="cell" data-label="Response Deadline">{optionalDateLabel(dispute.responseDeadline)}</span>
    </div>
  );
}

function DisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const disputeId = params.id ? decodeURIComponent(params.id) : '';
  const query = useGetDispute(disputeId, { query: { enabled: Boolean(disputeId), queryKey: getGetDisputeQueryKey(disputeId) } });
  const dispute = query.data;
  if (query.isLoading) return <div className="content"><Link href="/disputes" className="detail-back"><ArrowLeft size={14} /> All disputes</Link><DataState loading /></div>;
  if (query.isError || !dispute) return <div className="content"><Link href="/disputes" className="detail-back"><ArrowLeft size={14} /> All disputes</Link><DataState error retry={() => query.refetch()} /></div>;
  return (
    <div className="content">
      <Link href="/disputes" className="detail-back" data-testid="link-back-disputes"><ArrowLeft size={14} /> All disputes</Link>
      <PageIntro eyebrow={`Case ${dispute.id} · ${dispute.orderId}`} title={dispute.customerName} subtitle={dispute.orderDescription} action={<StatusPill status={dispute.status} />} />
      <div className="notice"><ShieldCheck size={16} /><div>This is a simulated case. The static guidance below is for human review and is not a prediction or AI-generated recommendation.</div></div>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel detail-card"><h2>Case information</h2><div className="facts">
            <div><div className="fact-label">Disputed amount</div><div className="fact-value">{money(dispute.amount, dispute.currency)}</div></div>
            <div><div className="fact-label">Dispute reason</div><div className="fact-value">{dispute.reason}</div></div>
            <div><div className="fact-label">Order reference</div><div className="fact-value">{dispute.orderId}</div></div>
            <div><div className="fact-label">Opened</div><div className="fact-value">{dateLabel(dispute.openedAt)}</div></div>
            <div><div className="fact-label">Response deadline</div><div className="fact-value">{dateLabel(dispute.responseDeadline, { month: 'long', day: 'numeric', year: 'numeric' })}</div></div>
            <div><div className="fact-label">Resolution</div><div className="fact-value">{dispute.resolution || 'No resolution recorded'}</div></div>
          </div></section>
          <section className="panel detail-card"><h2>Customer message</h2><blockquote className="message-quote">{dispute.customerMessage || 'No customer message provided in this demo case.'}</blockquote></section>
          <section className="panel detail-card"><h2>Evidence to consider</h2><div className="checklist">{(dispute.evidenceChecklist ?? []).map((item, index) => <div className="check-row" key={`${index}-${item}`}><span className="check-icon"><Check /></span><span>{item}</span></div>)}</div>{!dispute.evidenceChecklist?.length && <div className="page-subtitle">No checklist items are provided for this case.</div>}</section>
        </div>
        <aside className="detail-side">
          <section className="panel detail-card guidance"><h2>Static review guidance</h2><div className="notice"><AlertCircle size={17} /><div><strong>{dispute.recommendedAction}</strong><br />{dispute.actionDisclaimer}</div></div></section>
          <section className="panel detail-card"><h2>Review boundaries</h2><div className="checklist"><div className="check-row"><span className="check-icon"><Check /></span><span>Verify all details using your own official records.</span></div><div className="check-row"><span className="check-icon"><Check /></span><span>This checklist does not upload or submit evidence.</span></div><div className="check-row"><span className="check-icon"><Check /></span><span>No claim acceptance, refund, or provider connection.</span></div></div></section>
        </aside>
      </div>
    </div>
  );
}

function EvidencePage() {
  const query = useGetDisputes();
  const rows = (query.data ?? []).flatMap((dispute) => (dispute.evidenceChecklist ?? []).map((item, index) => ({ dispute, item, index })));
  return (
    <div className="content">
      <PageIntro eyebrow="Preparation only · simulated" title="Evidence preparation" subtitle="A read-only checklist of records you may want to inspect for each demo case." />
      <div className="notice"><FileCheck2 size={16} /><div><strong>Checklist view only.</strong> No files can be uploaded, shared, or submitted. This is not a payment-provider connection.</div></div>
      <div className="toolbar"><span className="list-meta" style={{ marginLeft: 0 }}>{query.isLoading ? 'Loading checklist' : `${rows.length} checklist ${rows.length === 1 ? 'item' : 'items'}`}</span><span className="list-meta">For your independent review</span></div>
      <div className="panel evidence-list">
        <DataState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={!query.isLoading && !query.isError && rows.length === 0}>
          {rows.map(({ dispute, item, index }) => <div className="evidence-item" key={`${dispute.id}-${index}`} data-testid={`evidence-item-${dispute.id}-${index}`}><div className="evidence-number">{String(index + 1).padStart(2, '0')}</div><div><div className="evidence-title">{item}</div><div className="evidence-case">{dispute.orderId} · {dispute.customerName}</div></div><Link href={`/disputes/${encodeURIComponent(dispute.id)}`} className="evidence-link" data-testid={`link-evidence-case-${dispute.id}`}>View case <ArrowRight size={12} /></Link></div>)}
        </DataState>
      </div>
    </div>
  );
}

function ActivityPage() {
  const query = useGetActivity();
  const entries: ActivityEntry[] = query.data ?? [];
  return (
    <div className="content">
      <PageIntro eyebrow="Case history · simulated" title="Activity log" subtitle="A chronological record of events included in this demonstration dataset." />
      <div className="notice"><Activity size={16} /><div>Every entry below is simulated. This log does not indicate live account activity.</div></div>
      <div className="section-heading" style={{ marginTop: 25 }}><h2>Recent activity</h2><span>{query.isLoading ? 'Loading' : `${entries.length} entries`}</span></div>
      <div className="panel panel-pad">
        <DataState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={!query.isLoading && !query.isError && entries.length === 0}>
          <div className="activity-list">{entries.map((entry) => <div className="activity-row" key={entry.id} data-testid={`activity-entry-${entry.id}`}><span className="activity-pin" /><div><div className="activity-title">{entry.title}</div><div className="activity-desc">{entry.description}<br /><Link href={`/disputes/${encodeURIComponent(entry.disputeId)}`} className="evidence-link" data-testid={`link-activity-case-${entry.id}`}>Open case {entry.disputeId}</Link></div></div><time className="activity-time" dateTime={entry.timestamp}>{dateLabel(entry.timestamp, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div>)}</div>
        </DataState>
      </div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={OverviewPage} />
          <Route path="/disputes" component={DisputesPage} />
          <Route path="/paypal-sandbox" component={PayPalSandboxPage} />
          <Route path="/evidence" component={EvidencePage} />
          <Route path="/activity" component={ActivityPage} />
          <Route path="/disputes/:id" component={DisputeDetailPage} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
