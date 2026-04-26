class AppointmentSorter:
    def merge_sort(self, arr):
        if len(arr) <= 1:
            return arr

        mid = len(arr) // 2
        left_half = arr[:mid]
        right_half = arr[mid:]

        left_sorted = self.merge_sort(left_half)
        right_sorted = self.merge_sort(right_half)

        return self.merge(left_sorted, right_sorted)

    def merge(self, left, right):
        sorted_list = []
        i = 0 
        j = 0

        while i < len(left) and j < len(right):
            # Combine date and time to compare them together 
            left_datetime = left[i]['date'] + " " + left[i]['time']
            right_datetime = right[j]['date'] + " " + right[j]['time']

            # We want the earliest dates first. 
            # Change < to > if you want the newest dates first!
            if left_datetime < right_datetime:
                sorted_list.append(left[i])
                i += 1
            else:
                sorted_list.append(right[j])
                j += 1

        # Add any leftover items from the left side
        while i < len(left):
            sorted_list.append(left[i])
            i += 1
            
        # Add any leftover items from the right side
        while j < len(right):
            sorted_list.append(right[j])
            j += 1

        return sorted_list