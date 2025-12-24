#!/usr/bin/env python3
"""
Backend API Test Suite for CalorieDiet App
Tests all backend endpoints with proper authentication flow.
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://7c5ee9e3-e863-4c3d-9335-d3634737ee84.preview.emergentagent.com/api"

class CalorieDietAPITester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{BACKEND_URL}{endpoint}"
        
        # Default headers
        default_headers = {"Content-Type": "application/json"}
        if self.session_token:
            default_headers["Authorization"] = f"Bearer {self.session_token}"
            
        if headers:
            default_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed for {endpoint}: {e}")
            raise
    
    def test_guest_authentication(self):
        """Test POST /api/auth/guest - Get guest token"""
        try:
            response = self.make_request("POST", "/auth/guest")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["session_token", "user_id", "email", "name"]
                
                if all(field in data for field in required_fields):
                    self.session_token = data["session_token"]
                    self.user_id = data["user_id"]
                    self.log_test("Guest Authentication", True, 
                                f"Token received, user_id: {self.user_id[:12]}...", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Guest Authentication", False, 
                                f"Missing fields: {missing}", data)
            else:
                self.log_test("Guest Authentication", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Guest Authentication", False, f"Exception: {str(e)}")
    
    def test_get_user_info(self):
        """Test GET /api/auth/me - Get current user info"""
        if not self.session_token:
            self.log_test("Get User Info", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["user_id", "email", "name"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Get User Info", True, 
                                f"User info retrieved for {data.get('name')}", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Get User Info", False, 
                                f"Missing fields: {missing}", data)
            else:
                self.log_test("Get User Info", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get User Info", False, f"Exception: {str(e)}")
    
    def test_update_profile(self):
        """Test PUT /api/auth/profile - Update user profile"""
        if not self.session_token:
            self.log_test("Update Profile", False, "No session token available")
            return
            
        profile_data = {
            "height": 175.0,
            "weight": 70.0,
            "age": 25,
            "gender": "male",
            "activity_level": "moderate",
            "goal": "maintain"
        }
        
        try:
            response = self.make_request("PUT", "/auth/profile", profile_data)
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and data.get("height") == 175.0:
                    self.log_test("Update Profile", True, 
                                "Profile updated successfully", data)
                else:
                    self.log_test("Update Profile", False, 
                                "Profile data not properly updated", data)
            else:
                self.log_test("Update Profile", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Update Profile", False, f"Exception: {str(e)}")
    
    def test_food_database(self):
        """Test GET /api/food/database?lang=tr - Get food database"""
        if not self.session_token:
            self.log_test("Food Database", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/food/database?lang=tr")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    first_item = data[0]
                    required_fields = ["food_id", "name", "calories", "protein", "carbs", "fat"]
                    
                    if all(field in first_item for field in required_fields):
                        self.log_test("Food Database", True, 
                                    f"Database loaded with {len(data)} items", 
                                    {"count": len(data), "sample": first_item})
                    else:
                        missing = [f for f in required_fields if f not in first_item]
                        self.log_test("Food Database", False, 
                                    f"Missing fields in food items: {missing}")
                else:
                    self.log_test("Food Database", False, "Empty or invalid food database")
            else:
                self.log_test("Food Database", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Food Database", False, f"Exception: {str(e)}")
    
    def test_add_meal(self):
        """Test POST /api/food/add-meal - Add a meal"""
        if not self.session_token:
            self.log_test("Add Meal", False, "No session token available")
            return
            
        meal_data = {
            "name": "Tavuk Göğsü",
            "calories": 165,
            "protein": 31.0,
            "carbs": 0.0,
            "fat": 3.6,
            "meal_type": "lunch"
        }
        
        try:
            response = self.make_request("POST", "/food/add-meal", meal_data)
            
            if response.status_code == 200:
                data = response.json()
                if "meal_id" in data and "message" in data:
                    self.log_test("Add Meal", True, 
                                f"Meal added with ID: {data['meal_id']}", data)
                else:
                    self.log_test("Add Meal", False, 
                                "Invalid response format", data)
            else:
                self.log_test("Add Meal", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Add Meal", False, f"Exception: {str(e)}")
    
    def test_get_today_meals(self):
        """Test GET /api/food/today - Get today's meals"""
        if not self.session_token:
            self.log_test("Get Today Meals", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/food/today")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Today Meals", True, 
                                f"Retrieved {len(data)} meals for today", 
                                {"count": len(data)})
                else:
                    self.log_test("Get Today Meals", False, 
                                "Invalid response format - expected list")
            else:
                self.log_test("Get Today Meals", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Today Meals", False, f"Exception: {str(e)}")
    
    def test_daily_summary(self):
        """Test GET /api/food/daily-summary - Get daily nutrition summary"""
        if not self.session_token:
            self.log_test("Daily Summary", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/food/daily-summary")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_calories", "total_protein", "total_carbs", "total_fat", "meal_count", "date"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Daily Summary", True, 
                                f"Summary: {data['total_calories']} cal, {data['meal_count']} meals", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Daily Summary", False, 
                                f"Missing fields: {missing}", data)
            else:
                self.log_test("Daily Summary", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Daily Summary", False, f"Exception: {str(e)}")
    
    def test_add_water(self):
        """Test POST /api/water/add - Add water intake"""
        if not self.session_token:
            self.log_test("Add Water", False, "No session token available")
            return
            
        water_data = {"amount": 250}
        
        try:
            response = self.make_request("POST", "/water/add", water_data)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Add Water", True, 
                                "Water intake added successfully", data)
                else:
                    self.log_test("Add Water", False, 
                                "Invalid response format", data)
            else:
                self.log_test("Add Water", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Add Water", False, f"Exception: {str(e)}")
    
    def test_get_today_water(self):
        """Test GET /api/water/today - Get today's water intake"""
        if not self.session_token:
            self.log_test("Get Today Water", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/water/today")
            
            if response.status_code == 200:
                data = response.json()
                if "total_amount" in data and "entries" in data:
                    self.log_test("Get Today Water", True, 
                                f"Water total: {data['total_amount']}ml", data)
                else:
                    self.log_test("Get Today Water", False, 
                                "Invalid response format", data)
            else:
                self.log_test("Get Today Water", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Today Water", False, f"Exception: {str(e)}")
    
    def test_get_weekly_water(self):
        """Test GET /api/water/weekly - Get weekly water intake"""
        if not self.session_token:
            self.log_test("Get Weekly Water", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/water/weekly")
            
            if response.status_code == 200:
                data = response.json()
                if "weekly_data" in data and isinstance(data["weekly_data"], list):
                    weekly_data = data["weekly_data"]
                    self.log_test("Get Weekly Water", True, 
                                f"Weekly water data: {len(weekly_data)} days", 
                                {"days": len(weekly_data)})
                else:
                    self.log_test("Get Weekly Water", False, 
                                "Invalid response format - expected weekly_data list", data)
            else:
                self.log_test("Get Weekly Water", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Weekly Water", False, f"Exception: {str(e)}")
    
    def test_sync_steps(self):
        """Test POST /api/steps/sync - Sync step count"""
        if not self.session_token:
            self.log_test("Sync Steps", False, "No session token available")
            return
            
        steps_data = {"steps": 5000}
        
        try:
            response = self.make_request("POST", "/steps/sync", steps_data)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Sync Steps", True, 
                                "Steps synced successfully", data)
                else:
                    self.log_test("Sync Steps", False, 
                                "Invalid response format", data)
            else:
                self.log_test("Sync Steps", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Sync Steps", False, f"Exception: {str(e)}")
    
    def test_get_today_steps(self):
        """Test GET /api/steps/today - Get today's steps"""
        if not self.session_token:
            self.log_test("Get Today Steps", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/steps/today")
            
            if response.status_code == 200:
                data = response.json()
                if "steps" in data and "source" in data and "date" in data:
                    self.log_test("Get Today Steps", True, 
                                f"Today's steps: {data['steps']} (source: {data['source']})", data)
                else:
                    self.log_test("Get Today Steps", False, 
                                "Invalid response format - missing required fields", data)
            else:
                self.log_test("Get Today Steps", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Today Steps", False, f"Exception: {str(e)}")
    
    def test_vitamin_templates(self):
        """Test GET /api/vitamins/templates - Get vitamin templates"""
        if not self.session_token:
            self.log_test("Vitamin Templates", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/vitamins/templates")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Vitamin Templates", True, 
                                f"Templates loaded: {len(data)} vitamins", 
                                {"count": len(data)})
                else:
                    self.log_test("Vitamin Templates", False, 
                                "Invalid response format - expected list")
            else:
                self.log_test("Vitamin Templates", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Vitamin Templates", False, f"Exception: {str(e)}")
    
    def test_add_vitamin(self):
        """Test POST /api/vitamins/add - Add vitamin intake"""
        if not self.session_token:
            self.log_test("Add Vitamin", False, "No session token available")
            return
            
        vitamin_data = {
            "name": "D Vitamini",
            "time": "morning"
        }
        
        try:
            response = self.make_request("POST", "/vitamins/add", vitamin_data)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Add Vitamin", True, 
                                "Vitamin added successfully", data)
                else:
                    self.log_test("Add Vitamin", False, 
                                "Invalid response format", data)
            else:
                self.log_test("Add Vitamin", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Add Vitamin", False, f"Exception: {str(e)}")
    
    def test_get_today_vitamins(self):
        """Test GET /api/vitamins/today - Get today's vitamins"""
        if not self.session_token:
            self.log_test("Get Today Vitamins", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/vitamins/today")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Today Vitamins", True, 
                                f"Today's vitamins: {len(data)} entries", 
                                {"count": len(data)})
                else:
                    self.log_test("Get Today Vitamins", False, 
                                "Invalid response format - expected list")
            else:
                self.log_test("Get Today Vitamins", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Today Vitamins", False, f"Exception: {str(e)}")
    
    def test_premium_status(self):
        """Test GET /api/premium/status - Get premium status"""
        if not self.session_token:
            self.log_test("Premium Status", False, "No session token available")
            return
            
        try:
            response = self.make_request("GET", "/premium/status")
            
            if response.status_code == 200:
                data = response.json()
                if "is_premium" in data:
                    self.log_test("Premium Status", True, 
                                f"Premium status: {data['is_premium']}", data)
                else:
                    self.log_test("Premium Status", False, 
                                "Invalid response format", data)
            else:
                self.log_test("Premium Status", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Premium Status", False, f"Exception: {str(e)}")
    
    def test_storage_status(self):
        """Test GET /api/debug/storage-status - Get MongoDB status"""
        try:
            response = self.make_request("GET", "/debug/storage-status")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["mongoConfigured", "mongoConnected", "status"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Storage Status", True, 
                                f"MongoDB status: {data['status']}", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Storage Status", False, 
                                f"Missing fields: {missing}", data)
            else:
                self.log_test("Storage Status", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Storage Status", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🚀 Starting CalorieDiet Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Authentication tests (must be first)
        self.test_guest_authentication()
        self.test_get_user_info()
        self.test_update_profile()
        
        # Food/Meal tests
        self.test_food_database()
        self.test_add_meal()
        self.test_get_today_meals()
        self.test_daily_summary()
        
        # Water tracking tests
        self.test_add_water()
        self.test_get_today_water()
        self.test_get_weekly_water()
        
        # Steps tracking tests
        self.test_sync_steps()
        self.test_get_today_steps()
        
        # Vitamins tracking tests
        self.test_vitamin_templates()
        self.test_add_vitamin()
        self.test_get_today_vitamins()
        
        # Premium/Status tests
        self.test_premium_status()
        self.test_storage_status()
        
        # Summary
        print("=" * 60)
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 TEST SUMMARY")
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print(f"\n🔗 Session Token: {self.session_token[:20]}..." if self.session_token else "No session token")
        print(f"👤 User ID: {self.user_id}" if self.user_id else "No user ID")

if __name__ == "__main__":
    tester = CalorieDietAPITester()
    tester.run_all_tests()