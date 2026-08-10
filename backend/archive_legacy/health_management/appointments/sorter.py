class AppointmentSorter:
    def merge_sort(self, arr):
        if len(arr) <= 1:
            return arr
        mid = len(arr) // 2
        left_sorted = self.merge_sort(arr[:mid])
        right_sorted = self.merge_sort(arr[mid:])
        return self.merge(left_sorted, right_sorted)

    def merge(self, left, right):
        sorted_list = []
        i = 0
        j = 0
        while i < len(left) and j < len(right):
            # Combine date and time to compare them together
            left_datetime = left[i]['date'] + " " + left[i]['time']
            right_datetime = right[j]['date'] + " " + right[j]['time']
            # Earliest dates first
            if left_datetime < right_datetime:
                sorted_list.append(left[i])
                i += 1
            else:
                sorted_list.append(right[j])
                j += 1
        while i < len(left):
            sorted_list.append(left[i])
            i += 1
        while j < len(right):
            sorted_list.append(right[j])
            j += 1
        return sorted_list
