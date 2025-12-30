from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid
import re
from datetime import datetime, timezone

from routes.auth_routes import get_admin_user, User

router = APIRouter(prefix="/admin", tags=["Admin"])

# Will be set from main server.py
db = None
cache = None

def set_db(database):
    global db
    db = database

def set_cache(cache_instance):
    global cache
    cache = cache_instance

def invalidate_blog_cache(slug: str = None):
    """Invalidate blog-related caches"""
    if cache:
        if slug:
            cache.invalidate(f"blog:{slug}")
        cache.invalidate("blogs:")


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


# ============ Profile CRUD ============
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    philosophy: Optional[str] = None
    motto: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    social: Optional[dict] = None


@router.get("/profile")
async def get_profile(admin: User = Depends(get_admin_user)):
    """Get profile data for editing"""
    profile = await db.profile.find_one({}, {"_id": 0})
    if not profile:
        return {"message": "No profile found, using defaults"}
    return profile


@router.put("/profile")
async def update_profile(profile_data: ProfileUpdate, admin: User = Depends(get_admin_user)):
    """Update profile data"""
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Upsert profile
    await db.profile.update_one(
        {},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Profile updated successfully"}


# ============ Projects CRUD ============
class ProjectCreate(BaseModel):
    title: str
    description: str
    tags: List[str]
    image: str
    link: str = "#"


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    image: Optional[str] = None
    link: Optional[str] = None


@router.get("/projects")
async def list_projects(admin: User = Depends(get_admin_user)):
    """List all projects for admin"""
    projects = await db.projects.find({}, {"_id": 0}).to_list(100)
    return projects


@router.post("/projects")
async def create_project(project: ProjectCreate, admin: User = Depends(get_admin_user)):
    """Create a new project"""
    project_doc = {
        "id": str(uuid.uuid4()),
        **project.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.projects.insert_one(project_doc)
    return {"id": project_doc["id"], "message": "Project created successfully"}


@router.put("/projects/{project_id}")
async def update_project(project_id: str, project: ProjectUpdate, admin: User = Depends(get_admin_user)):
    """Update a project"""
    update_data = {k: v for k, v in project.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project updated successfully"}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, admin: User = Depends(get_admin_user)):
    """Delete a project"""
    result = await db.projects.delete_one({"id": project_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}


# ============ Skills CRUD ============
class SkillCreate(BaseModel):
    name: str
    level: int = Field(ge=0, le=100)
    category: str


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = Field(default=None, ge=0, le=100)
    category: Optional[str] = None


@router.get("/skills")
async def list_skills(admin: User = Depends(get_admin_user)):
    """List all skills for admin"""
    skills = await db.skills.find({}, {"_id": 0}).to_list(100)
    return skills


@router.post("/skills")
async def create_skill(skill: SkillCreate, admin: User = Depends(get_admin_user)):
    """Create a new skill"""
    skill_doc = {
        "id": str(uuid.uuid4()),
        **skill.model_dump()
    }
    
    await db.skills.insert_one(skill_doc)
    return {"id": skill_doc["id"], "message": "Skill created successfully"}


@router.put("/skills/{skill_id}")
async def update_skill(skill_id: str, skill: SkillUpdate, admin: User = Depends(get_admin_user)):
    """Update a skill"""
    update_data = {k: v for k, v in skill.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.skills.update_one(
        {"id": skill_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    return {"message": "Skill updated successfully"}


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str, admin: User = Depends(get_admin_user)):
    """Delete a skill"""
    result = await db.skills.delete_one({"id": skill_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    return {"message": "Skill deleted successfully"}


# ============ Contact Messages ============
@router.get("/messages")
async def list_messages(admin: User = Depends(get_admin_user)):
    """List all contact messages"""
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return messages


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, admin: User = Depends(get_admin_user)):
    """Delete a contact message"""
    result = await db.contact_messages.delete_one({"id": message_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Message deleted successfully"}


# ============ Dashboard Stats ============
@router.get("/stats")
async def get_stats(admin: User = Depends(get_admin_user)):
    """Get dashboard statistics"""
    # Count actual documents in database
    db_projects = await db.projects.count_documents({})
    db_skills = await db.skills.count_documents({})
    messages_count = await db.contact_messages.count_documents({})
    users_count = await db.users.count_documents({})
    blogs_count = await db.blogs.count_documents({})
    
    # If no projects/skills in DB, count the default fallback data
    projects_count = db_projects if db_projects > 0 else 6  # 6 default projects
    skills_count = db_skills if db_skills > 0 else 10  # 10 default skills
    
    return {
        "projects": projects_count,
        "skills": skills_count,
        "messages": messages_count,
        "users": users_count,
        "blogs": blogs_count,
        "using_defaults": db_projects == 0 or db_skills == 0
    }


# ============ Page Content CRUD ============
class PageContentUpdate(BaseModel):
    hero_tagline: Optional[str] = None
    hero_name: Optional[str] = None
    hero_role: Optional[str] = None
    hero_philosophy: Optional[str] = None
    stats_experience: Optional[str] = None
    stats_projects: Optional[str] = None
    stats_clients: Optional[str] = None
    stats_location: Optional[str] = None
    about_bio: Optional[str] = None
    about_location: Optional[str] = None
    about_timezone: Optional[str] = None
    about_philosophy_quote: Optional[str] = None
    contact_heading: Optional[str] = None
    contact_description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    blog_title: Optional[str] = None
    blog_description: Optional[str] = None


@router.get("/content/{page}")
async def get_page_content(page: str, admin: User = Depends(get_admin_user)):
    """Get content for a specific page"""
    content = await db.page_content.find_one({"page": page}, {"_id": 0})
    if not content:
        return {"page": page, "content": {}}
    return content


@router.put("/content/{page}")
async def update_page_content(page: str, content_data: PageContentUpdate, admin: User = Depends(get_admin_user)):
    """Update content for a specific page"""
    update_data = {k: v for k, v in content_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.page_content.update_one(
        {"page": page},
        {"$set": {"page": page, **update_data}},
        upsert=True
    )
    
    return {"message": f"{page} content updated successfully"}


# ============ Blog CRUD ============
class BlogCreate(BaseModel):
    title: str
    content: str
    excerpt: Optional[str] = ""
    image: Optional[str] = ""
    tags: List[str] = []
    category: Optional[str] = "General"
    is_featured: bool = False
    is_published: bool = True
    comments_enabled: bool = True
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    author_avatar: Optional[str] = None
    slug: Optional[str] = None
    editor_blocks: Optional[List[dict]] = None  # Editor.js blocks data
    reading_time: Optional[int] = None


class BlogUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    image: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None
    comments_enabled: Optional[bool] = None
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    author_avatar: Optional[str] = None
    slug: Optional[str] = None
    editor_blocks: Optional[List[dict]] = None  # Editor.js blocks data
    reading_time: Optional[int] = None


def calculate_reading_time(content: str) -> int:
    """Calculate reading time in minutes"""
    words = len(content.split())
    return max(1, round(words / 200))


@router.get("/blogs")
async def list_blogs(admin: User = Depends(get_admin_user)):
    """List all blogs for admin"""
    blogs = await db.blogs.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return blogs


@router.post("/blogs")
async def create_blog(blog: BlogCreate, admin: User = Depends(get_admin_user)):
    """Create a new blog post"""
    # Use custom slug if provided, otherwise generate from title
    if blog.slug and blog.slug.strip():
        slug = blog.slug.strip().lower()
        slug = re.sub(r'[^a-z0-9-]', '', slug)
        slug = re.sub(r'-+', '-', slug).strip('-')
    else:
        slug = generate_slug(blog.title)
    
    # Check if slug exists
    existing = await db.blogs.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    blog_data = blog.model_dump()
    blog_data.pop('slug', None)  # Remove slug from data as we set it separately
    
    # Use frontend-provided reading_time or calculate it
    reading_time = blog.reading_time if blog.reading_time else calculate_reading_time(blog.content)
    
    blog_doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        **blog_data,
        "reading_time": reading_time,
        "views": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.blogs.insert_one(blog_doc)
    
    # Invalidate cache so new blog appears in lists
    invalidate_blog_cache()
    
    return {"id": blog_doc["id"], "slug": slug, "message": "Blog created successfully"}


@router.put("/blogs/{blog_id}")
async def update_blog(blog_id: str, blog: BlogUpdate, admin: User = Depends(get_admin_user)):
    """Update a blog post"""
    # Get existing blog to get slug for cache invalidation
    existing_blog = await db.blogs.find_one({"id": blog_id})
    old_slug = existing_blog.get("slug") if existing_blog else None
    
    update_data = {k: v for k, v in blog.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Recalculate reading time if content updated
    if "content" in update_data:
        update_data["reading_time"] = calculate_reading_time(update_data["content"])
    
    # Handle slug - use custom slug if provided, otherwise generate from title if title changed
    new_slug = None
    if "slug" in update_data and update_data["slug"]:
        slug = update_data["slug"].strip().lower()
        slug = re.sub(r'[^a-z0-9-]', '', slug)
        slug = re.sub(r'-+', '-', slug).strip('-')
        update_data["slug"] = slug
        new_slug = slug
    elif "title" in update_data:
        update_data["slug"] = generate_slug(update_data["title"])
        new_slug = update_data["slug"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.blogs.update_one(
        {"id": blog_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # Invalidate cache for old and new slugs
    if old_slug:
        invalidate_blog_cache(old_slug)
    if new_slug and new_slug != old_slug:
        invalidate_blog_cache(new_slug)
    invalidate_blog_cache()  # Also invalidate list cache
    
    return {"message": "Blog updated successfully"}


@router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str, admin: User = Depends(get_admin_user)):
    """Delete a blog post"""
    # Get blog first to get slug for cache invalidation
    blog = await db.blogs.find_one({"id": blog_id})
    slug = blog.get("slug") if blog else None
    
    result = await db.blogs.delete_one({"id": blog_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # Also delete all comments for this blog
    await db.comments.delete_many({"blog_id": blog_id})
    
    # Invalidate cache
    if slug:
        invalidate_blog_cache(slug)
    invalidate_blog_cache()
    
    return {"message": "Blog deleted successfully"}


# ============ Comments Admin ============
@router.get("/comments")
async def list_all_comments(admin: User = Depends(get_admin_user)):
    """List all comments for admin moderation"""
    comments = await db.comments.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return comments


@router.get("/comments/blog/{blog_id}")
async def list_blog_comments_admin(blog_id: str, admin: User = Depends(get_admin_user)):
    """List all comments for a specific blog"""
    comments = await db.comments.find({"blog_id": blog_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return comments


class CommentUpdate(BaseModel):
    content: Optional[str] = None
    is_approved: Optional[bool] = None
    is_hidden: Optional[bool] = None


@router.put("/comments/{comment_id}")
async def update_comment(comment_id: str, data: CommentUpdate, admin: User = Depends(get_admin_user)):
    """Update/moderate a comment"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.comments.update_one({"id": comment_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    return {"message": "Comment updated"}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, admin: User = Depends(get_admin_user)):
    """Delete a comment and its replies"""
    # Delete main comment
    result = await db.comments.delete_one({"id": comment_id})
    
    # Delete all replies to this comment
    await db.comments.delete_many({"parent_id": comment_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    return {"message": "Comment deleted"}


# ============ Categories CRUD ============
class CategoryCreate(BaseModel):
    name: str


@router.get("/categories")
async def list_categories(admin: User = Depends(get_admin_user)):
    """List all categories"""
    categories = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    
    # Always ensure "General" exists
    category_names = [c["name"] for c in categories]
    if "General" not in category_names:
        # Add General if not in database
        general_doc = {
            "id": str(uuid.uuid4()),
            "name": "General",
            "slug": "general",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.categories.insert_one(general_doc)
        categories.insert(0, {"id": general_doc["id"], "name": "General", "slug": "general", "created_at": general_doc["created_at"]})
    
    return categories


@router.post("/categories")
async def create_category(category: CategoryCreate, admin: User = Depends(get_admin_user)):
    """Create a new category"""
    name = category.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    
    # Check if category already exists
    existing = await db.categories.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    slug = generate_slug(name)
    
    category_doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "slug": slug,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categories.insert_one(category_doc)
    return {"id": category_doc["id"], "name": name, "slug": slug, "message": "Category created successfully"}


@router.delete("/categories/{category_name}")
async def delete_category(category_name: str, admin: User = Depends(get_admin_user)):
    """Delete a category (cannot delete 'General')"""
    if category_name.lower() == "general":
        raise HTTPException(status_code=400, detail="Cannot delete the default 'General' category")
    
    # Find and delete the category
    result = await db.categories.delete_one({"name": category_name})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Update any blogs using this category to 'General'
    await db.blogs.update_many(
        {"category": category_name},
        {"$set": {"category": "General"}}
    )
    
    return {"message": f"Category '{category_name}' deleted successfully"}

