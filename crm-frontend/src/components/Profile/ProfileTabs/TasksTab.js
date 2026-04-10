import React from 'react';
import api from '../../../apiClient';

class TasksTab extends React.Component {
  state = {
    loading: true,
    tasks: [],
    title: '',
  };

  componentDidMount() {
    this.load();
  }

  load = async () => {
    const leadId = this.props?.lead?.id || this.props?.lead?.raw?.id;
    if (!leadId) {
      this.setState({ loading: false, tasks: [] });
      return;
    }
    try {
      const { data } = await api.get('/tasks/');
      const rows = Array.isArray(data) ? data : data?.results || [];
      this.setState({
        loading: false,
        tasks: rows.filter((row) => String(row?.lead) === String(leadId)),
      });
    } catch {
      this.setState({ loading: false, tasks: [] });
    }
  };

  createTask = async () => {
    const leadId = this.props?.lead?.id || this.props?.lead?.raw?.id;
    const title = String(this.state.title || '').trim();
    if (!leadId || !title) return;
    try {
      await api.post('/tasks/', {
        lead: leadId,
        title,
        task_type: 'follow_up',
        status: 'pending',
      });
      this.setState({ title: '' });
      this.load();
    } catch {
      // Keep UI stable on failed task creation.
    }
  };

  render() {
    const { loading, tasks, title } = this.state;
    const leadId = this.props?.lead?.id || this.props?.lead?.raw?.id;

    if (!leadId) {
      return <div style={{ padding: 16 }}>Tasks are available once this record is linked to a lead.</div>;
    }

    return (
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={title}
            onChange={(e) => this.setState({ title: e.target.value })}
            placeholder="Follow-up task title"
            style={{ flex: 1 }}
          />
          <button type="button" onClick={this.createTask}>
            Add
          </button>
        </div>

        {loading ? <div>Loading tasks...</div> : null}
        {!loading && tasks.length === 0 ? <div>No tasks linked to this lead yet.</div> : null}
        {!loading &&
          tasks.map((task) => (
            <div
              key={task.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: 10,
                background: '#fff',
              }}
            >
              <strong>{task.title || 'Task'}</strong>
              <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                {task.status || 'pending'}
              </div>
            </div>
          ))}
      </div>
    );
  }
}

export default TasksTab;
