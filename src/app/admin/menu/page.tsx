'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  X,
  Upload,
  Tag,
  DollarSign
} from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string
  image_url: string | null
  is_available: boolean
  created_at: string
  category?: Category
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true
  })

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (categoriesError) {
        console.error('Failed to load categories:', categoriesError)
      } else {
        setCategories(categoriesData || [])
      }

      // Load menu items with categories
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:categories(*)
        `)
        .order('name')

      if (itemsError) {
        console.error('Failed to load menu items:', itemsError)
      } else {
        setMenuItems(itemsData || [])
      }
    } catch (error) {
      console.error('Error loading menu data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category_id) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .insert({
          name: itemForm.name,
          description: itemForm.description || null,
          price: parseFloat(itemForm.price),
          category_id: itemForm.category_id,
          image_url: itemForm.image_url || null,
          is_available: itemForm.is_available
        })

      if (error) throw error

      setShowAddItem(false)
      setItemForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        is_available: true
      })
      await loadData()
    } catch (error: any) {
      console.error('Failed to add menu item:', error)
      alert(`Failed to add menu item: ${error.message}`)
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !itemForm.name || !itemForm.price || !itemForm.category_id) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: itemForm.name,
          description: itemForm.description || null,
          price: parseFloat(itemForm.price),
          category_id: itemForm.category_id,
          image_url: itemForm.image_url || null,
          is_available: itemForm.is_available
        })
        .eq('id', editingItem.id)

      if (error) throw error

      setEditingItem(null)
      await loadData()
    } catch (error: any) {
      console.error('Failed to update menu item:', error)
      alert(`Failed to update menu item: ${error.message}`)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return

    try {
      // First check if there are any orders with this menu item
      const { data: orderItems, error: checkError } = await supabase
        .from('order_items')
        .select('id')
        .eq('menu_item_id', itemId)
        .limit(1)

      if (checkError) {
        console.error('Failed to check for existing orders:', checkError)
        alert('Failed to check for existing orders')
        return
      }

      if (orderItems && orderItems.length > 0) {
        // Item has orders, offer soft deletion instead
        const softDelete = confirm(
          'This menu item has existing orders and cannot be permanently deleted. ' +
          'Would you like to hide it instead? (This will make it unavailable for new orders but preserve order history)'
        )
        
        if (softDelete) {
          const { error } = await supabase
            .from('menu_items')
            .update({ 
              is_available: false,
              // If you have a deleted_at column, uncomment the next line:
              // deleted_at: new Date().toISOString()
            })
            .eq('id', itemId)

          if (error) throw error

          alert('Menu item has been hidden and is no longer available for ordering')
          await loadData()
        }
        return
      }

      // No orders found, safe to delete
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      await loadData()
    } catch (error: any) {
      console.error('Failed to delete menu item:', error)
      
      // Handle specific foreign key constraint error
      if (error.message.includes('foreign key constraint') || error.message.includes('violates')) {
        alert(
          'Cannot delete this menu item because it has existing orders. ' +
          'You can hide it instead by clicking the "Hide" button to make it unavailable for new orders.'
        )
      } else {
        alert(`Failed to delete menu item: ${error.message}`)
      }
    }
  }

  const handleAddCategory = async () => {
    if (!categoryForm.name) {
      alert('Please enter a category name')
      return
    }

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: categoryForm.name,
          description: categoryForm.description || null,
          is_active: categoryForm.is_active
        })

      if (error) throw error

      setShowAddCategory(false)
      setCategoryForm({
        name: '',
        description: '',
        is_active: true
      })
      await loadData()
    } catch (error: any) {
      console.error('Failed to add category:', error)
      alert(`Failed to add category: ${error.message}`)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryForm.name) {
      alert('Please enter a category name')
      return
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: categoryForm.name,
          description: categoryForm.description || null,
          is_active: categoryForm.is_active
        })
        .eq('id', editingCategory.id)

      if (error) throw error

      setEditingCategory(null)
      await loadData()
    } catch (error: any) {
      console.error('Failed to update category:', error)
      alert(`Failed to update category: ${error.message}`)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This will also affect all menu items in this category.')) return

    try {
      // First check if there are menu items in this category
      const { data: menuItems, error: checkError } = await supabase
        .from('menu_items')
        .select('id, name')
        .eq('category_id', categoryId)

      if (checkError) {
        console.error('Failed to check for existing menu items:', checkError)
        alert('Failed to check for existing menu items')
        return
      }

      if (menuItems && menuItems.length > 0) {
        // Check if any of these menu items have orders
        const menuItemIds = menuItems.map(item => item.id)
        const { data: orderItems, error: orderCheckError } = await supabase
          .from('order_items')
          .select('menu_item_id')
          .in('menu_item_id', menuItemIds)
          .limit(1)

        if (orderCheckError) {
          console.error('Failed to check for existing orders:', orderCheckError)
          alert('Failed to check for existing orders')
          return
        }

        if (orderItems && orderItems.length > 0) {
          alert(
            `Cannot delete this category because it contains menu items with existing orders. ` +
            `You can hide individual menu items instead or move them to another category first.`
          )
          return
        }

        // Confirm deletion of menu items
        const confirmDelete = confirm(
          `This category contains ${menuItems.length} menu item(s). ` +
          `Deleting the category will also delete all these menu items. Continue?`
        )
        
        if (!confirmDelete) return
      }

      // Safe to delete
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      await loadData()
    } catch (error: any) {
      console.error('Failed to delete category:', error)
      
      // Handle specific foreign key constraint error
      if (error.message.includes('foreign key constraint') || error.message.includes('violates')) {
        alert(
          'Cannot delete this category because it contains menu items with existing orders. ' +
          'Please hide or move the menu items first, or contact support for assistance.'
        )
      } else {
        alert(`Failed to delete category: ${error.message}`)
      }
    }
  }

  const toggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', itemId)

      if (error) throw error

      await loadData()
    } catch (error: any) {
      console.error('Failed to update item availability:', error)
      alert(`Failed to update availability: ${error.message}`)
    }
  }

  const startEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || '',
      is_available: item.is_available
    })
  }

  const startEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active
    })
  }

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600">Manage categories and menu items</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowAddCategory(true)}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <Tag className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button
            onClick={() => setShowAddItem(true)}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Menu Item
          </Button>
        </div>
      </div>

      {/* Categories Management */}
      <Card>
        <CardHeader>
          <CardTitle>Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="border rounded-lg p-4">
                {editingCategory?.id === category.id ? (
                  <div className="space-y-3">
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Category name"
                    />
                    <Input
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description (optional)"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={categoryForm.is_active}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded"
                      />
                      <label className="text-sm">Active</label>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleUpdateCategory}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{category.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        category.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                    )}
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditCategory(category)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No menu items found</p>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  {editingItem?.id === item.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Input
                          value={itemForm.name}
                          onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Item name *"
                        />
                        <textarea
                          value={itemForm.description}
                          onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          rows={3}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={itemForm.price}
                            onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="Price *"
                          />
                          <select
                            value={itemForm.category_id}
                            onChange={(e) => setItemForm(prev => ({ ...prev, category_id: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Category *</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Input
                          value={itemForm.image_url}
                          onChange={(e) => setItemForm(prev => ({ ...prev, image_url: e.target.value }))}
                          placeholder="Image URL (optional)"
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={itemForm.is_available}
                            onChange={(e) => setItemForm(prev => ({ ...prev, is_available: e.target.checked }))}
                            className="rounded"
                          />
                          <label className="text-sm">Available</label>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={handleUpdateItem}>
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                              if (nextElement) {
                                nextElement.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <span className="text-gray-500 text-xs">No Image</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.is_available 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{item.description || 'No description'}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="font-semibold text-orange-500 text-lg">
                            {formatPrice(item.price)}
                          </span>
                          <span>Category: {item.category?.name}</span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleItemAvailability(item.id, item.is_available)}
                        >
                          {item.is_available ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Show
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditItem(item)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add New Menu Item</h2>
                <Button variant="ghost" onClick={() => setShowAddItem(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <Input
                      value={itemForm.name}
                      onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter item name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={itemForm.description}
                      onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter item description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="number"
                          step="0.01"
                          value={itemForm.price}
                          onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        value={itemForm.category_id}
                        onChange={(e) => setItemForm(prev => ({ ...prev, category_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image URL
                    </label>
                    <div className="relative">
                      <Upload className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        value={itemForm.image_url}
                        onChange={(e) => setItemForm(prev => ({ ...prev, image_url: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Provide a direct URL to the menu item image
                    </p>
                  </div>

                  {itemForm.image_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image Preview
                      </label>
                      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img
                          src={itemForm.image_url}
                          alt="Preview"
                          className="max-w-full max-h-full object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                            if (nextElement) {
                              nextElement.style.display = 'block'
                            }
                          }}
                        />
                        <span className="text-gray-500 text-sm hidden">Invalid image URL</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={itemForm.is_available}
                      onChange={(e) => setItemForm(prev => ({ ...prev, is_available: e.target.checked }))}
                      className="rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Available for ordering
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAddItem(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddItem}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Add Menu Item
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add New Category</h2>
                <Button variant="ghost" onClick={() => setShowAddCategory(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter category description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Active category
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAddCategory(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCategory}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Add Category
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}