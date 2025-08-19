import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "./SupabaseClient";
import "./Calendar.css";

const ComplianceDeadlines = () => {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // Default to list view
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "Company",
    due_date: "",
    priority: "Medium",
    status: "Pending",
    assigned_to: "",
  });

  const complianceTypes = [
    "All",
    "Tax",
    "Finance",
    "Company",
    "Legal Agreements",
    "Shipments",
    "KYC",
    "Operations",
  ];
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("All Tasks");
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortOption, setSortOption] = useState("deadline");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchTasks();
    
    // Check URL parameters for task creation
    const urlParams = new URLSearchParams(location.search);
    const action = urlParams.get('action');
    
    if (action === 'create-task') {
      console.log('Creating task from URL parameters:', location.search);
      
      // Pre-fill form with URL parameters
      const subject = urlParams.get('subject') || '';
      const priority = urlParams.get('priority') || 'Medium';
      const dueDate = urlParams.get('dueDate') || '';
      const source = urlParams.get('source') || '';
      const type = urlParams.get('type') || 'Company';
      
      // Validate and format due date
      let formattedDueDate = dueDate;
      if (dueDate) {
        try {
          const date = new Date(dueDate);
          if (isNaN(date.getTime())) {
            formattedDueDate = ''; // Invalid date, clear it
          } else {
            formattedDueDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          }
        } catch (error) {
          formattedDueDate = '';
        }
      }
      
      // Map priority to match form options (case-insensitive)
      let mappedPriority = 'Medium';
      if (priority.toLowerCase() === 'high') mappedPriority = 'High';
      else if (priority.toLowerCase() === 'low') mappedPriority = 'Low';
      else if (priority.toLowerCase() === 'medium') mappedPriority = 'Medium';
      
      // Map type to match form options
      let mappedType = 'Company';
      if (type === 'tax-return') mappedType = 'Tax';
      else if (type === 'document-analysis') mappedType = 'Company';
      else if (type === 'channel-management') mappedType = 'Operations';
      else if (type === 'general') mappedType = 'Company';
      
      const newFormData = {
        title: subject,
        description: `Task created from ${source} - ${subject}`,
        type: mappedType,
        due_date: formattedDueDate,
        priority: mappedPriority,
        status: "Pending",
        assigned_to: "",
      };
      
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
      
      // Auto-open the form
      setShowForm(true);
      setSuccessMessage(""); // Clear any existing success message
    }
    
    // Check if there's pending task data from the analysis modal
    const pendingTaskData = sessionStorage.getItem('pendingTaskData');
    if (pendingTaskData) {
      try {
        const taskData = JSON.parse(pendingTaskData);
        setFormData({
          title: taskData.title || "",
          description: taskData.description || "",
          type: taskData.type || "Company",
          due_date: taskData.due_date || "",
          priority: taskData.priority || "Medium",
          status: taskData.status || "Pending",
          assigned_to: taskData.assigned_to || "",
        });
        setShowForm(true);
        // Clear the pending task data
        sessionStorage.removeItem('pendingTaskData');
      } catch (error) {
        console.error('Error parsing pending task data:', error);
        sessionStorage.removeItem('pendingTaskData');
      }
    }
  }, [location.search]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error("No user session found");
      }

      const { data, error } = await supabase
        .from("calendar")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    setShowForm(true);
    setSuccessMessage(""); // Clear any existing success message
  };

  const handleCloseModal = () => {
    setShowForm(false);
    
    // Clear URL parameters when form is closed
    if (location.search.includes('action=create-task')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    try {
      // Get the current user session
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        console.error("User is not authenticated");
        alert("You must be logged in to create a task.");
        return;
      }

      // Prepare the new task object
      const newTask = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        due_date: formData.due_date,
        priority: formData.priority,
        status: formData.status,
        assigned_to: formData.assigned_to || null, // Optional field

        user_id: sessionData.session.user.id, // Associate the task with the logged-in user
        created_at: new Date().toISOString(), // Add a timestamp
      };

      console.log("New Task:", newTask); // Debugging: Log the task object

      // Insert the new task into the "calendar" table
      const { data, error } = await supabase.from("calendar").insert([newTask]);

      if (error) {
        console.error("Supabase Insert Error:", error); // Debugging: Log the error
        alert("Failed to add task. Please try again.");
        return;
      }

      console.log("Task added successfully:", data); // Debugging: Log the response

      // Refresh the task list and reset the form
      await fetchTasks();
      setFormData({
        title: "",
        description: "",
        type: "Company",
        due_date: "",
        priority: "Medium",
        status: "Pending",
        assigned_to: "",
      });
      setSelectedTags([]);
      setShowForm(false); // Close the form modal
      
      // Clear URL parameters after successful task creation
      if (location.search.includes('action=create-task')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Show success message
      setSuccessMessage("Task created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000); // Auto-hide after 3 seconds
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task. Please try again.");
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle tag click to toggle selection
  const handleTagClick = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from("calendar")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) {
        console.error("Error updating status:", error);
        alert("Failed to update task status. Please try again.");
        return;
      }

      // Update the task in the local state to avoid a full refetch
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update task status. Please try again.");
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortOption === "deadline") {
      return new Date(a.due_date) - new Date(b.due_date); // Sort by deadline
    } else if (sortOption === "priority") {
      const priorityOrder = { high: 1, medium: 2, low: 3 }; // Priority order
      return (
        priorityOrder[a.priority.toLowerCase()] -
        priorityOrder[b.priority.toLowerCase()]
      ); // Sort by priority
    }
    return 0;
  });

  const filteredTasks = sortedTasks.filter((task) => {
    // Filter by category
    if (activeCategory !== "All" && task.type !== activeCategory) {
      return false;
    }
    
    // Filter by tab
    if (activeTab === "All Tasks") {
      return true; // Show all tasks
    } else if (activeTab === "Ongoing") {
      return task.status === "In Progress"; // Show tasks with status "In Progress"
    } else if (activeTab === "Blocked") {
      return task.status === "Blocked"; // Show tasks with status "Blocked"
    } else if (activeTab === "Completed") {
      return task.status === "Completed"; // Show tasks with status "Completed"
    }
    return false; // Default case
  });

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h2>Tasks</h2>
        <p>Manage and track your company's tasks and to-dos</p>
        
        {/* Success Message */}
        {successMessage && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.2)',
            color: '#4CAF50',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginTop: '1rem',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            ✅ {successMessage}
          </div>
        )}
        
        <div className="tasks-actions">
          <button className="add-task-button" onClick={handleAddTask}>
            <span>+</span> Start a New Task <span>▼</span>
          </button>
          
          <div className="view-controls">
            <div className="view-options">
              <button
                className={`list-view-button ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <span className="icon">☰</span>
              </button>
              <button
                className={`grid-view-button ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                <span className="icon">▦</span>
              </button>
            </div>
            
            <div className="sort-control">
              <select
                className="sort-dropdown"
                value={sortOption}
                onChange={handleSortChange}
              >
                <option value="deadline">Sort by Deadline</option>
                <option value="priority">Sort by Priority</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="filter-buttons tab-buttons">
        {["All Tasks", "Ongoing", "Blocked", "Completed"].map((tab) => (
          <button
            key={tab}
            className={`filter-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Categories Section */}
      <div className="categories-section">
        <div className="categories-label">Categories:</div>
        <div className="filter-buttons category-buttons">
          {complianceTypes.map((type) => (
            <button
              key={type}
              className={`filter-button ${activeCategory === type ? "active" : ""}`}
              onClick={() => setActiveCategory(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Task count */}
      <div className="tasks-count">
        <h3>Tasks <span className="count">({filteredTasks.length})</span></h3>
      </div>

      {showForm && (
        <div className="calendar-task-modal-overlay" onClick={handleCloseModal}>
          <div
            className="calendar-task-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="calendar-task-modal-title">Create New Company Task</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="calendar-task-modal-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                  placeholder="Enter task title"
                />
              </div>
              <div className="calendar-task-modal-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                  placeholder="Enter task description"
                />
              </div>
              <div className="calendar-task-modal-row">
                <div className="calendar-task-modal-group">
                  <label htmlFor="due_date">Deadline</label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="calendar-task-modal-group">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="calendar-task-modal-row">
                <div className="calendar-task-modal-group">
                  <label htmlFor="type">Category</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
                    required
                  >
                    {complianceTypes.slice(1).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="calendar-task-modal-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="calendar-task-modal-group">
                <label htmlFor="assigned_to">Assigned To (optional)</label>
                <input
                  type="text"
                  id="assigned_to"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleFormChange}
                  placeholder="Enter assignee name"
                />
              </div>
              <div className="calendar-task-modal-group calendar-task-modal-tags">
                <label>Company Tags</label>
                <div className="calendar-task-modal-tags-container">
                  {["documentation", "policy", "operations", "structure"].map((tag) => (
                    <span
                      key={tag}
                      className={`calendar-task-modal-tag ${selectedTags.includes(tag) ? "selected" : ""}`}
                      onClick={() => handleTagClick(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="calendar-task-modal-actions">
                <button
                  type="button"
                  className="calendar-task-modal-cancel"
                  onClick={() => {
                    setShowForm(false);
                    // Clear URL parameters when form is cancelled
                    if (location.search.includes('action=create-task')) {
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="calendar-task-modal-submit">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="no-tasks">No tasks found</div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map((task, index) => (
            <div key={index} className={`task-item ${viewMode}-view`}>
              <div className="task-icon">
                {task.type === "Finance" && "📊"}
                {task.type === "Tax" && "📋"}
                {task.type === "Company" && "👤"}
                {task.type === "Legal Agreements" && "📄"}
                {task.type === "Shipments" && "📦"}
                {task.type === "KYC" && "🔍"}
                {task.type === "Operations" && "⚙️"}
              </div>
              <div className="task-content">
                <div className="task-header">
                  <div className="task-title">
                    <h3>{task.title}</h3>
                    <p className="task-description">{task.description}</p>
                  </div>
                </div>
                <div className="task-tags">
                  <span className="task-tag">{task.type}</span>
                  {task.recurring && <span className="task-tag">Recurring</span>}
                </div>
              </div>
              <div className="task-meta">
                <div className="task-date">
                  <span className="meta-icon">📅</span> {task.due_date}
                </div>
                <div className={`priority ${task.priority.toLowerCase()}`}>
                  {task.priority}
                </div>
                <div className="status-wrapper">
                  <span className={`status-indicator status-${task.status.toLowerCase().replace(/\s+/g, '-')}`}></span>
                  <select 
                    className="task-status-dropdown"
                    value={task.status}
                    onChange={(e) => {
                      handleStatusChange(task.id, e.target.value);
                    }}
                  >
                    <option value="Pending">
                      Pending
                    </option>
                    <option value="In Progress">
                      In Progress
                    </option>
                    <option value="Blocked">
                      Blocked
                    </option>
                    <option value="Completed">
                      Completed
                    </option>
                  </select>
                </div>
                <div className="assigned-to">
                  <span className="meta-icon">👤</span> {task.assigned_to}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComplianceDeadlines;
