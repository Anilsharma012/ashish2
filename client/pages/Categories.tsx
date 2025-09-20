import { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import {
  getPropertyTypesForSubcategory,
  PropertyType,
} from "../data/propertyTypes";

interface Category {
  _id?: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  subcategories: Subcategory[];
  order: number;
  active: boolean;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  count?: number;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [subcategoryCounts, setSubcategoryCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    fetchCategories();
    fetchPropertyCounts();
  }, []);

  const fetchCategories = async (options: { cacheBust?: boolean } = {}) => {
    try {
      setLoading(true);
      const cacheBuster = options.cacheBust ? `&_=${Date.now()}` : "";
      const url = `/api/categories?published=true&limit=200${cacheBuster}`;
      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const data = await response
        .json()
        .catch(() => ({ success: false, data: [] }));

      if (data.success) {
        setCategories(data.data || []);
        try {
          window.dispatchEvent(new CustomEvent("categories:updated"));
        } catch {}
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyCounts = async () => {
    try {
      const response = await fetch("/api/properties", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const data = await response.json();

      if (data.success) {
        const counts: Record<string, number> = {};
        data.data.properties?.forEach((property: any) => {
          if (property.subCategory) {
            counts[property.subCategory] =
              (counts[property.subCategory] || 0) + 1;
          }
        });
        setSubcategoryCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching property counts:", error);
    }
  };

  const handleCategoryClick = (category: Category) => {
    // For mobile: show subcategories
    if (window.innerWidth < 768) {
      setSelectedCategory(category);
    } else {
      // For desktop: navigate directly to category page
      window.location.href = `/categories/${category.slug}`;
    }
  };

  const handleBackClick = () => {
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
    } else {
      setSelectedCategory(null);
    }
  };

  const handleSubcategoryClick = (subcategory: Subcategory) => {
    const propertyTypes = getPropertyTypesForSubcategory(subcategory.slug);

    if (propertyTypes.length > 0) {
      // Show property types for this subcategory
      setSelectedSubcategory(subcategory);
    } else {
      // Navigate directly to filtered property list
      window.location.href = `/categories/${selectedCategory?.slug}/${subcategory.slug}`;
    }
  };

  const handlePropertyTypeClick = (propertyType: PropertyType) => {
    // Navigate to filtered property list with property type
    window.location.href = `/categories/${selectedCategory?.slug}/${selectedSubcategory?.slug}/${propertyType.slug}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Property Types View
  if (selectedSubcategory && selectedCategory) {
    const propertyTypes = getPropertyTypesForSubcategory(
      selectedSubcategory.slug,
    );

    return (
      <div className="min-h-screen bg-white">
        <Header />

        <div className="px-4 py-6">
          {/* Header with Back Button */}
          <div className="flex items-center mb-6">
            <button onClick={handleBackClick} className="mr-4 p-2">
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-medium text-gray-900">
                {selectedSubcategory.name}
              </h1>
              <p className="text-sm text-gray-500">Choose property type</p>
            </div>
          </div>

          {/* Property Types List */}
          <div className="space-y-2">
            {propertyTypes.map((propertyType) => (
              <button
                key={propertyType.id}
                onClick={() => handlePropertyTypeClick(propertyType)}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">
                      {propertyType.icon || selectedCategory.icon}
                    </span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 text-base">
                      {propertyType.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {propertyType.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  // Subcategories View
  if (selectedCategory) {
    return (
      <div className="min-h-screen bg-white">
        <Header />

        <div className="px-4 py-6">
          {/* Header with Back Button */}
          <div className="flex items-center mb-6">
            <button onClick={handleBackClick} className="mr-4 p-2">
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </button>
            <h1 className="text-xl font-medium text-gray-900">
              {selectedCategory.name}
            </h1>
          </div>

          {/* Subcategories List */}
          <div className="space-y-2">
            {(selectedCategory.subcategories || []).map((subcategory) => (
              <button
                key={subcategory.id}
                onClick={() => handleSubcategoryClick(subcategory)}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">{selectedCategory.icon}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 text-base">
                      {subcategory.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {subcategory.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {subcategoryCounts[subcategory.slug] && (
                    <span className="text-xs bg-[#C70000] text-white px-2 py-1 rounded-full">
                      {subcategoryCounts[subcategory.slug]}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-medium text-gray-900">All Categories</h1>
          <div>
            <button
              onClick={() => fetchCategories({ cacheBust: true })}
              className="text-sm text-[#C70000] font-medium hover:underline"
            >
              Refresh categories
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-2">
          {categories.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No categories yet
            </div>
          ) : (
            categories.map((category) => (
              <button
                key={category._id || category.slug}
                onClick={() => handleCategoryClick(category)}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">{category.icon}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 text-base">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {category.subcategories?.length ?? 0} types
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
