/* ============================================================
   KUDII — Jobs
   Track work from pending → in progress → completed.
   Completing a job does NOT mean you've been paid — payment is
   always a separate, recorded event.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  Briefcase,
  Plus,
  ArrowLeft,
  MoreVertical,
  Pencil,
  CircleDollarSign,
  CalendarClock,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  Ban,
  Search as SearchIcon,
  User,
} from 'lucide-react'
import { useDB, useConfirm, useToast } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { PageHead } from '../components/shell'
import {
  Button,
  IconButton,
  SearchInput,
  Segmented,
  Badge,
  StatusBadge,
  EmptyState,
  SectionCard,
  Menu,
  MenuItem,
  KV,
} from '../components/ui'
import { scope, jobPaid, jobBalance, jobPaymentState } from '../lib/derive'
import { formatMoney, formatDate, formatDateTime, isOverdue, timeAgo } from '../lib/utils'
import type { Job, JobStatus } from '../lib/types'

export default function Jobs({ id }: { id?: string }) {
  if (id) return <JobDetail id={id} />
  return <JobList />
}

const STATUS_TABS: { value: 'all' | JobStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

/* ============================================================
   LIST
   ============================================================ */
function JobList() {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'all' | JobStatus>('all')

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'
  const all = scope.jobs(db, businessId)

  const jobs = useMemo(() => {
    let list = all
    if (tab !== 'all') list = list.filter((j) => j.status === tab)
    list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((j) => {
      const cust = db.customers.find((c) => c.id === j.customer_id)
      return j.title.toLowerCase().includes(q) || (cust?.name.toLowerCase().includes(q) ?? false)
    })
  }, [db, businessId, query, tab])

  const active = all.filter((j) => j.status === 'pending' || j.status === 'in_progress')
  const completed = all.filter((j) => j.status === 'completed')
  const unpaid = all.filter((j) => j.status !== 'cancelled' && jobBalance(db, j) > 0)
  const overdue = active.filter((j) => isOverdue(j.due_date))

  return (
    <div className="stack gap-6">
      <PageHead
        title="Jobs"
        sub="Work in progress, what's done, and what's still owed."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => composer.open('job')}>
            New job
          </Button>
        }
      />

      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="ic jobs">
            <PlayCircle size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{active.length}</div>
          <div className="l">Active jobs</div>
        </div>
        <div className="pulse-card">
          <span className="ic in">
            <CheckCircle2 size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{completed.length}</div>
          <div className="l">Completed</div>
        </div>
        <div className="pulse-card">
          <span className="ic due">
            <CircleDollarSign size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{unpaid.length}</div>
          <div className="l">Awaiting payment</div>
        </div>
        <div className="pulse-card">
          <span className="ic out">
            <CalendarClock size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{overdue.length}</div>
          <div className="l">Overdue</div>
        </div>
      </div>

      <div className="row gap-3 wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search jobs or customers…" className="grow" />
        <Segmented value={tab} onChange={setTab} options={STATUS_TABS} />
      </div>

      {jobs.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={query ? SearchIcon : Briefcase}
            title={query ? 'No matches' : 'No jobs yet'}
            message={query ? 'Try a different search term.' : 'Create a job to track work from start to finish.'}
            action={
              !query ? (
                <Button variant="primary" icon={Plus} onClick={() => composer.open('job')}>
                  Create a job
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <SectionCard padded={false}>
          <div className="list">
            {jobs.map((j) => {
              const cust = db.customers.find((c) => c.id === j.customer_id)
              const overdueJob = isOverdue(j.due_date) && (j.status === 'pending' || j.status === 'in_progress')
              return (
                <button key={j.id} className="list-row" onClick={() => navigate(`/jobs/${j.id}`)}>
                  <span className="tl-ic" style={{ width: 40, height: 40, borderRadius: 12 }}>
                    <Briefcase size={18} strokeWidth={2} />
                  </span>
                  <span className="list-main">
                    <span className="list-title">{j.title}</span>
                    <span className="list-sub">
                      {cust ? cust.name : 'No customer'}
                      {j.due_date ? ` · due ${formatDate(j.due_date)}` : ''}
                      {overdueJob ? ' · overdue' : ''}
                    </span>
                  </span>
                  <span className="list-end">
                    <span className="num" style={{ fontWeight: 600 }}>
                      {formatMoney(j.amount, currency)}
                    </span>
                    <StatusBadge status={j.status} />
                  </span>
                </button>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

/* ============================================================
   DETAIL
   ============================================================ */
function JobDetail({ id }: { id: string }) {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const confirm = useConfirm()
  const toast = useToast()

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const job = db.jobs.find((j) => j.id === id && j.business_id === businessId)

  if (!job) {
    return (
      <div className="stack gap-6">
        <PageHead title="Job not found" sub="This job may have been removed." />
        <SectionCard>
          <EmptyState
            icon={Briefcase}
            title="We couldn't find that job"
            message="It may have been deleted or belongs to another business."
            action={
              <Button variant="primary" onClick={() => navigate('/jobs')}>
                Back to jobs
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  const paid = jobPaid(db, job.id)
  const balance = jobBalance(db, job)
  const state = jobPaymentState(db, job)
  const cust = db.customers.find((c) => c.id === job.customer_id)
  const overdueJob = isOverdue(job.due_date) && (job.status === 'pending' || job.status === 'in_progress')

  const setStatus = (status: JobStatus) => {
    store.setJobStatus(job.id, status)
    toast.push(`Job marked ${status.replace('_', ' ')}`)
  }

  const cancelJob = async () => {
    const res = await confirm({
      title: 'Cancel this job?',
      message: 'The job will be marked cancelled. The record is kept for your history.',
      confirmLabel: 'Cancel job',
      danger: true,
    })
    if (!res.confirmed) return
    setStatus('cancelled')
  }

  return (
    <div className="stack gap-6">
      <button className="link" onClick={() => navigate('/jobs')} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={15} /> All jobs
      </button>

      <div className="detail-hero">
        <span className="tl-ic" style={{ width: 64, height: 64, borderRadius: 18 }}>
          <Briefcase size={28} strokeWidth={1.8} />
        </span>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--fs-28)', letterSpacing: '-0.02em' }}>{job.title}</h1>
            <StatusBadge status={job.status} />
            {overdueJob && <Badge tone="danger" dot>Overdue</Badge>}
          </div>
          <div className="row gap-4 wrap mt-2" style={{ color: 'var(--text-2)', fontSize: 'var(--fs-13)' }}>
            {cust && (
              <button className="link" onClick={() => navigate(`/customers/${cust.id}`)}>
                <User size={14} /> {cust.name}
              </button>
            )}
            {job.due_date && (
              <span className="row gap-1" style={{ alignItems: 'center' }}>
                <CalendarClock size={14} /> Due {formatDate(job.due_date)}
              </span>
            )}
            <span>{formatMoney(job.amount, currency)}</span>
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          {job.status !== 'cancelled' && balance > 0 && (
            <Button variant="primary" icon={CircleDollarSign} onClick={() => composer.open('payment', { job_id: job.id, customer_id: job.customer_id || undefined })}>
              Record payment
            </Button>
          )}
          <Menu align="right" trigger={({ toggle }) => <IconButton icon={MoreVertical} label="More" variant="ghost" onClick={toggle} />}>
            {(close) => (
              <>
                <MenuItem icon={Pencil} onClick={() => { composer.open('job', { id: job.id }); close() }}>
                  Edit job
                </MenuItem>
                <div className="menu-sep" />
                {job.status !== 'cancelled' && (
                  <MenuItem icon={Ban} danger onClick={() => { cancelJob(); close() }}>
                    Cancel job
                  </MenuItem>
                )}
              </>
            )}
          </Menu>
        </div>
      </div>

      {/* Status control */}
      {job.status !== 'cancelled' && (
        <SectionCard title="Status">
          <div className="row gap-2 wrap">
            <Button
              variant={job.status === 'pending' ? 'primary' : 'soft'}
              icon={RotateCcw}
              onClick={() => setStatus('pending')}
            >
              Pending
            </Button>
            <Button
              variant={job.status === 'in_progress' ? 'primary' : 'soft'}
              icon={PlayCircle}
              onClick={() => setStatus('in_progress')}
            >
              In progress
            </Button>
            <Button
              variant={job.status === 'completed' ? 'primary' : 'soft'}
              icon={CheckCircle2}
              onClick={() => setStatus('completed')}
            >
              Completed
            </Button>
          </div>
        </SectionCard>
      )}

      <div className="grid-main">
        <div className="stack gap-5">
          {job.description && (
            <SectionCard title="Description">
              <p className="text-sm muted" style={{ whiteSpace: 'pre-wrap' }}>
                {job.description}
              </p>
            </SectionCard>
          )}

          <SectionCard title="Details">
            <dl className="kv">
              <KV label="Customer">{cust ? cust.name : 'No customer'}</KV>
              <KV label="Amount">{formatMoney(job.amount, currency)}</KV>
              <KV label="Due date">{job.due_date ? formatDate(job.due_date) : 'No due date'}</KV>
              <KV label="Created">{formatDate(job.created_at)}</KV>
              {job.completed_at && <KV label="Completed">{formatDate(job.completed_at)}</KV>}
            </dl>
            {job.notes && (
              <div className="mt-4">
                <div className="eyebrow">Notes</div>
                <p className="text-sm muted mt-1">{job.notes}</p>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="stack gap-5">
          <SectionCard title="Payment">
            <div className="row-between" style={{ alignItems: 'flex-end' }}>
              <div>
                <div className="stat-value lg num" style={{ color: balance > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {formatMoney(balance, currency)}
                </div>
                <div className="text-xs muted">{balance > 0 ? 'still owed' : 'fully settled'}</div>
              </div>
              <StatusBadge status={state} />
            </div>
            <div className="divider" style={{ margin: 'var(--s-5) 0' }} />
            <dl className="kv">
              <KV label="Job amount">{formatMoney(job.amount, currency)}</KV>
              <KV label="Paid">{formatMoney(paid, currency)}</KV>
              <KV label="Balance">{formatMoney(balance, currency)}</KV>
            </dl>
            {balance > 0 && (
              <Button
                variant="soft"
                block
                className="mt-4"
                icon={CircleDollarSign}
                onClick={() => composer.open('payment', { job_id: job.id, customer_id: job.customer_id || undefined })}
              >
                Record a payment
              </Button>
            )}
          </SectionCard>

          <SectionCard title="Timeline">
            <div className="timeline">
              <div className="tl-item">
                <span className="tl-ic">
                  <Briefcase size={15} strokeWidth={2} />
                </span>
                <div className="tl-body">
                  <div className="tl-title">Job created</div>
                  <div className="tl-meta">{timeAgo(job.created_at)}</div>
                </div>
              </div>
              {job.completed_at && (
                <div className="tl-item">
                  <span className="tl-ic" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                    <CheckCircle2 size={15} strokeWidth={2} />
                  </span>
                  <div className="tl-body">
                    <div className="tl-title">Job completed</div>
                    <div className="tl-meta">{timeAgo(job.completed_at)}</div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
